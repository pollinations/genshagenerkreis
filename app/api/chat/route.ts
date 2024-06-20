import OpenAI from "openai"
import { OpenAIStream, StreamingTextResponse, Message} from "ai"
import axios from 'axios';
import FormData from 'form-data';
import fs from 'node:fs';
import fetch from 'node-fetch';

const initialMessages = [
  { role: "system", content: `
You are receiving a transcript of messages from a conference. 

Each time you receive a new sentence I want you to update an image prompt for an image generator to reflect the new sentence. 

It should be abstract and humorous.
Respond with a maximum of 77 tokens or around 50 words.
Add style references to the prompt. The style references should always appear at the end of the prompt.
- try to stick to the provided styles and themes but adapt the subjects
- choose the theme/style that seems most appropriate for the input prompt
- interpret the concepts in the input prompt very freely and creatively

# Possible Styles
- vintage photo
- bokeh kodak film vintage photo black and white sepia
- retrofuturism style
- Minimalist, Symbolic, Abstract
- Cubist, Modern, Mixed Media
- Abstract, Modern, Symbolic
- Minimalist, Continuous Line Drawing
- Rough, Visible Textures
- Bauhaus Exhibition Poster
- Sci-Fi, Futuristic, Simon Stalenhag
- bauhaus and dadaism

Only respond with the prompt and nothing else.
Response format: [short 4 word content summary] [extra detail] [style references]
` }
];

// Climate terrorists that drive an SUV
// Although it should keep some things from before. 
// The prompt should continuously evolve to reflect the conversation. 
// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  baseURL: "https://api.openai.com/v1",
})

// IMPORTANT! Set the runtime to edge
export const runtime = "edge"

// Constant to control image generation
const GENERATE_SD3_IMAGE = true;

/**
 * Handles the POST request to the OpenAI API.
 * Sends the initialMessages plus the last three messages from the request.
 * Optionally generates an image using SD3 Turbo.
 * @param {Request} req - The incoming request object.
 * @returns {Response} - The response from the OpenAI API.
 */
export async function POST(req: Request) {
  const { messages } = await req.json()

  // Combine initialMessages with the last three messages from the request
  const combinedMessagesUnparsed = [
    ...initialMessages,
    ...messages.slice(-2)
  ];

  const combinedMessages = combinedMessagesUnparsed.map(removeImageData);

  console.log("messages", combinedMessages);

  // Ask OpenAI for a chat completion given the prompt
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    stream: false,
    messages: combinedMessages,
  })

  const messageContent = response.choices[0].message.content;

  if (messageContent === null) {
    throw new Error("Received null message content from OpenAI API");
  }

  if (GENERATE_SD3_IMAGE) {
    let imageResponse;
    try {
      imageResponse = await generateSD3Image(messageContent);
    } catch (error) {
      console.error("Error generating SD3 image, trying Pollinations image:", error);
      imageResponse = await generatePollinationsImage(messageContent);
    }
    return new Response(JSON.stringify({
      message: messageContent,
      image: imageResponse
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return new Response(JSON.stringify({ message: messageContent }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Generates an image using SD3 Turbo.
 * @param {string} prompt - The prompt for the image generation.
 * @returns {Promise<string>} - The URL of the generated image.
 */
async function generateSD3Image(prompt: string): Promise<string> {

  // remove all characters that are not dots, spaces and alphanumeric nad german umlaut

  const host = "https://api.stability.ai/v2beta/stable-image/generate/sd3";
  const payload = new FormData();
  payload.append("prompt", prompt);
  payload.append("aspect_ratio", "1:1");
  payload.append("seed", 0);
  payload.append("output_format", "jpeg");
  payload.append("model", "sd3-large-turbo");

  const headers = {
    "Authorization": `Bearer ${process.env.STABILITY_KEY}`,
    "Accept": "image/*"
  };

  console.log("Sending request to SD3 Turbo API");
  console.log("Host:", host);
  console.log("Payload:", payload);
  console.log("Headers:", headers);
  console.log("Prompt:", prompt);

  try {
    const response = await fetch(host, {
      method: 'POST',
      headers: headers,
      body: payload
    });

    console.log("Response status:", response.status);

    if (response.status !== 200) {
      const errorText = await response.text();
      console.error("Error response text:", errorText);
      throw new Error(`${response.status}: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    console.log("Generated image (base64):", base64Image.slice(0, 100));
    return `data:image/jpeg;base64,${base64Image}`;
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
}

/**
 * Generates an image using Pollinations.
 * @param {string} prompt - The prompt for the image generation.
 * @returns {Promise<string>} - The URL of the generated image.
 */
async function generatePollinationsImage(prompt: string): Promise<string> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?enhance=true`;

  try {
    const response = await fetch(url);

    if (response.status !== 200) {
      const errorText = await response.text();
      console.error("Error response text:", errorText);
      throw new Error(`${response.status}: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    console.log("Generated image (base64):", base64Image.slice(0, 100));
    return `data:image/jpeg;base64,${base64Image}`;
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
}

/**
 * Removes image data from the message content.
 * Tries to parse the content as JSON and extracts the message property if successful.
 * @param {Message} message - The message object.
 * @returns {Object} - An object containing the role and the actual content.
 */
function removeImageData(message: Message) {
  let content = message.content;

  try {
    const parsedContent = JSON.parse(content);
    if (parsedContent.message) {
      content = parsedContent.message;
    }
  } catch (error) {
    // If parsing fails, use the original content
  }

  if (content.length > 2000) {
    content = content.slice(0, 2000);
  }

  return {
    role: message.role,
    content: content
  };
}

