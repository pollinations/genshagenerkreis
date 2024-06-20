"use client"
import 'regenerator-runtime/runtime';
import { useChat, Message as ChatMessage } from "ai/react"
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useEffect, useRef, memo, useState } from "react";

// Message component to display the last assistant message's image and content
const LastAssistantMessage = ({ message }: { message: ChatMessage }) => {
  const imageprompt = message.content;
  return (
    <div className="flex flex-col items-center">
      {message.role === "assistant" && message.content.length > 50 && (
        <img height="768" width="768" src={`https://image.pollinations.ai/prompt/${encodeURIComponent(imageprompt)}`} alt="Generated" className="mt-2 rounded-lg" />
      )}
      <div className="whitespace-pre-wrap mt-4 text-center" style={{ fontSize: "1.2rem" }}>
        {message.content.slice(0, 150)+"..."}
      </div>
    </div>
  );
};

export default function Chat() {
  const { messages, input, handleSubmit, append, handleInputChange } = useChat();

  const {
    transcript,
    listening,
    browserSupportsSpeechRecognition,
    resetTranscript
  } = useSpeechRecognition()

  const formRef = useRef<HTMLFormElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lastAssistantMessage, setLastAssistantMessage] = useState<ChatMessage | null>(null);
  const [displayedTranscript, setDisplayedTranscript] = useState<string>("");

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

  useEffect(() => {
    const newLastAssistantMessage = messages.slice().reverse().find(message => message.role === "assistant");
    if (newLastAssistantMessage) {
      const image = new Image();
      image.src = `https://image.pollinations.ai/prompt/${encodeURIComponent(newLastAssistantMessage.content)}`;
      image.onload = () => {
        setLastAssistantMessage(newLastAssistantMessage);
      };
    }
  }, [messages]);

  useEffect(() => {
    if (transcript.length >= 10) {
      setDisplayedTranscript(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    console.log("Transcript:", transcript);
    console.log("Last Assistant Message Content:", lastAssistantMessage?.content);
    console.log("Displayed Transcript:", displayedTranscript);
  }, [transcript, lastAssistantMessage, displayedTranscript]);

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>
  }

  return (
    <main className="bg-gray-900 text-white">
      <h1 className="mt-0 m-10 text-4xl md:text-6xl text-center pt-10 md:pt-20 font-bold tracking-tighter">
        <span className="underline underline-offset-8">DreamStream</span>{" "}
        ft. <span className="text-red-500">Groq</span> and <span className="text-red-500">Pollinations.AI</span>
      </h1>

      <div className="flex flex-col max-w-xl mx-auto pt-2 md:pt-10 pb-32">
        <div className="text-center mb-4" style={{ fontSize: "1.5rem" }}>{displayedTranscript}</div>
        {lastAssistantMessage && <LastAssistantMessage message={lastAssistantMessage} />}
        <div ref={messagesEndRef} />

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex items-start justify-center">
          <input
            className="rounded-full p-4 w-full border-2 border-gray-700 bg-gray-800 fixed bottom-10 left-0 right-0 z-10 m-auto max-w-xs md:max-w-2xl placeholder:text-sm text-white"
            value={input || transcript}
            placeholder="Say something..."
            onChange={handleInputChange}
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
