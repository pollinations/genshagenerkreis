import OpenAI from "openai"
import { OpenAIStream, StreamingTextResponse, Message} from "ai"

// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "",
  baseURL: "https://api.groq.com/openai/v1",
})

// IMPORTANT! Set the runtime to edge
export const runtime = "edge"

export async function POST(req: Request) {
  const { messages } = await req.json()
  console.log("messages", messages)
  // Ask OpenAI for a chat completion given the prompt
  const response = await openai.chat.completions.create({
    model: "llama3-70b-8192",
    stream: false,
    messages,
  })

  return new Response(response.choices[0].message.content);
}

