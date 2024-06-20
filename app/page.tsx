"use client"
import 'regenerator-runtime/runtime';
import { useChat, Message as ChatMessage } from "ai/react"
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useEffect, useRef, memo } from "react";

// Message component to display individual messages
const Message = ({ message }: { message: ChatMessage }) => {
  return (
    <div
      key={message.id}
      className={`rounded-lg p-4 mb-4 ${
        message.role === "user"
          ? "bg-blue-700 text-white max-w-max mx-6"
          : "bg-gray-700 text-gray-300 mx-6"
      }`}>
      <div className="whitespace-pre-wrap">
        {message.role === "user" ? (
          <span className="font-semibold mr-1">User:</span>
        ) : (
          <span className="font-semibold mr-1">Mixtral:</span>
        )}
        {message.content}
        {message.role === "assistant" && message.content.length > 50 && (
          <img height="768" width="768" src={`https://image.pollinations.ai/prompt/${encodeURIComponent(message.content)}`} alt="Generated" className="mt-2 rounded-lg" />
        )}
      </div>
    </div>
  );
};

export default function Chat() {
  const { messages, input, handleSubmit, append } = useChat();

  const {
    transcript,
    listening,
    browserSupportsSpeechRecognition,
    resetTranscript
  } = useSpeechRecognition()

  const formRef = useRef<HTMLFormElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleVoiceInput = () => {
    if (!listening) {
      SpeechRecognition.startListening({ continuous: false})//, language: 'de-DE' })
    }
  }

  useEffect(() => {
    if (!listening && transcript) {
      console.log("appending", transcript)
      append({
        role: "user",
        content: transcript
      })
      resetTranscript();
    }
  }, [listening, transcript, handleSubmit, resetTranscript]);

  useEffect(handleVoiceInput, [listening]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  console.log("messages", messages[messages.length - 1].content);

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>
  }

  return (
    <main className="bg-gray-900 text-white">
      <h1 className="mt-0 m-10 text-4xl md:text-6xl text-center pt-10 md:pt-20 font-bold tracking-tighter">
        Chat with <span className="underline underline-offset-8">Mixtral</span>{" "}
        ft. <span className="text-red-500">Groq</span> Cloud
      </h1>

      <div className="flex flex-col max-w-xl mx-auto pt-2 md:pt-10 pb-32">
        {messages.map((m) => <Message key={m.id} message={m} />)}
        <div ref={messagesEndRef} />

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex items-start justify-center">
          <input
            className="rounded-full p-4 w-full border-2 border-gray-700 bg-gray-800 fixed bottom-10 left-0 right-0 z-10 m-auto max-w-xs md:max-w-2xl placeholder:text-sm text-white"
            value={input || transcript}
            placeholder="Say something..."
            // onChange={handleInputChange}
          />
          <button
            type="button"
            onClick={handleVoiceInput}
            className="ml-2 p-2 bg-blue-500 text-white rounded-full">
            {listening ? "Listening..." : "Speak"}
          </button>
        </form>
      </div>
    </main>
  )
}
