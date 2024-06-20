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
Although it should keep some things from before. 
The prompt should continuously evolve to reflect the conversation. 
It should be abstract and humorous.
Only respond with the prompt and nothing else.
Respond with a maximum of 77 tokens or around 50 words.
Add surrealism and dadaism to the prompt.` }
];



// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "",
  baseURL: "https://api.groq.com/openai/v1",
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
    ...messages.slice(-3)
  ];

  const combinedMessages = combinedMessagesUnparsed.map(removeImageData);

  console.log("messages", combinedMessages);

  // Ask OpenAI for a chat completion given the prompt
  const response = await openai.chat.completions.create({
    // model: "llama3-70b-8192",
    model: randomModel(),
    stream: false,
    messages: combinedMessages,
  })

  const messageContent = response.choices[0].message.content;

  if (messageContent === null) {
    throw new Error("Received null message content from OpenAI API");
  }

  if (GENERATE_SD3_IMAGE) {
    const sd3Response = await generateSD3Image(messageContent);
    return new Response(JSON.stringify({
      message: messageContent,
      image: sd3Response
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
  const host = "https://api.stability.ai/v2beta/stable-image/generate/sd3";
  const payload = new FormData();
  payload.append("prompt", prompt);
  payload.append("aspect_ratio", "1:1");
  payload.append("seed", "42");
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

  try {
    const response = await fetch(host, {
      method: 'POST',
      headers: headers,
      body: payload
    });

    console.log("Response status:", response.status);

    if (response.status !== 200) {
      const errorText = await response.text();
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

  return {
    role: message.role,
    content: content
  };
}


const randomModel = () => {
  const models = ["gemma-7b-it", "llama3-8b-8192", "mixtral-8x7b-32768", "llama3-70b-8192", "mixtral-8x7b-32768"];
  const randomIndex = Math.floor(Math.random() * models.length);
  return models[randomIndex];
}
