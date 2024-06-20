import OpenAI from "openai"
import { OpenAIStream, StreamingTextResponse, Message} from "ai"


const initialMessages = [
  { id: "1", role: "system", content: `
You are receiving a transcript of messages from a conference. 
Each time you receive a new sentence I want you to update an image prompt for an image generator to partially reflect the new sentence. 
Although it should keep things from before. I.e. the prompt you contiuously generate should slowly evolve to reflect the conversation. 
It should be abstract and humurous.
Only respond with the prompt and nothing else.
You should respond with a maximum of 77 tokens or around 50 words.
` }
];

// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "",
  baseURL: "https://api.groq.com/openai/v1",
})

// IMPORTANT! Set the runtime to edge
export const runtime = "edge"

/**
 * Handles the POST request to the OpenAI API.
 * Sends the initialMessages plus the last two messages from the request.
 * @param {Request} req - The incoming request object.
 * @returns {Response} - The response from the OpenAI API.
 */
export async function POST(req: Request) {
  const { messages } = await req.json()
  console.log("messages", messages);

  // Combine initialMessages with the last two messages from the request
  const combinedMessages = [
    ...initialMessages,
    ...messages.slice(-2)
  ];

  // Ask OpenAI for a chat completion given the prompt
  const response = await openai.chat.completions.create({
    model: "llama3-70b-8192",
    stream: false,
    messages: combinedMessages,
  })

  return new Response(response.choices[0].message.content);
}

