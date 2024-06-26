"use client"
import 'regenerator-runtime/runtime';
import { useChat, Message as ChatMessage } from "ai/react"
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useEffect, useRef, memo, useState } from "react";

const ENABLE_AUTO_DOWNLOADS = false;

// Custom hook for speech recognition
const useSpeechRecognitionHook = (append: (message: ChatMessage) => void) => {
  const {
    transcript,
    listening,
    browserSupportsSpeechRecognition,
    resetTranscript
  } = useSpeechRecognition();

  const [displayedTranscript, setDisplayedTranscript] = useState<string>("");
  const [enableSpeech, setEnableSpeech] = useState<boolean>(true);
  const [lastAppendTime, setLastAppendTime] = useState<number>(0);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState("");

  const handleVoiceInput = () => {
    if (!listening) {
      SpeechRecognition.startListening({ continuous: false, 
        // language: 'de-DE'
       });
    }
  };

  useEffect(() => {
    const currentTime = Date.now();
    if (!listening && transcript && enableSpeech) {
      if (currentTime - lastAppendTime < 10000) {
        setAccumulatedTranscript(accumulatedTranscript + ".\n" + transcript);
      }
      else {
        console.log("sending", transcript);
        append({
          role: "user",
          content: accumulatedTranscript + ".\n" + transcript
        });
        resetTranscript();
        setLastAppendTime(currentTime); 
        setAccumulatedTranscript("");
      }
    }
  }, [listening, transcript, append, resetTranscript, enableSpeech, lastAppendTime]);

  useEffect(handleVoiceInput, [listening]);

  useEffect(() => {
    if (transcript.length >= 10 && enableSpeech) {
      setDisplayedTranscript(transcript);
    }
  }, [transcript]);

  const handleCheckboxChange = () => {
    setEnableSpeech(!enableSpeech);
  };

  return {
    transcript,
    listening,
    browserSupportsSpeechRecognition,
    displayedTranscript: enableSpeech ? displayedTranscript : null,
    handleVoiceInput,
    enableSpeech,
    handleCheckboxChange
  };
};

const downloadedImages: { image: string, content: string }[] = [];
  // Function to download the image
const downloadImage = (image: string, content: string) => {
    const existingImage = downloadedImages.find(img => img.content === content);
    if (existingImage) {
      return;
    }

    const link = document.createElement('a');
    link.href = image;
    link.download = `image_${content.slice(0, 120).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    downloadedImages.push({ image, content });
  };

// Message component to display the last assistant message's image and content
const LastAssistantMessage = ({ message }: { message: { role: string, content: string, image: string } }) => {
  const image = message.image;
  const content = message.content;

  useEffect(() => {
    if (ENABLE_AUTO_DOWNLOADS && message.role === "assistant" && message.image) {
      downloadImage(message.image, message.content);
    }
  }, [message]);

  const handleImageClick = () => {
    if (!ENABLE_AUTO_DOWNLOADS && message.role === "assistant" && message.image) {
      downloadImage(message.image, message.content);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="whitespace-pre-wrap mt-4 text-center" style={{ fontSize: "1.3rem" }}>
        {content.slice(0, 220) + "..."}
      </div>
      {message.role === "assistant" && message.content.length > 50 && (
        <img height="768" width="768" src={image} alt="Generated" className="mt-2 rounded-lg" onClick={handleImageClick} />
      )}
    </div>
  );
};

export default function Chat() {
  const { messages, input, handleSubmit, append, handleInputChange } = useChat();

  const formRef = useRef<HTMLFormElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lastAssistantMessage, setLastAssistantMessage] = useState<{ role: string, content: string, image: string } | null>(null);

  const {
    transcript,
    listening,
    browserSupportsSpeechRecognition,
    displayedTranscript,
    handleVoiceInput,
    enableSpeech,
    handleCheckboxChange
  } = useSpeechRecognitionHook(append);

  useEffect(() => {
    const newLastAssistantMessageAndImage = messages.slice().reverse().find(message => message.role === "assistant");
    if (newLastAssistantMessageAndImage) {
      console.log("newLastAssistantMessageAndImage", newLastAssistantMessageAndImage.content);
      try {
        const msgAndImageJson = JSON.parse(newLastAssistantMessageAndImage.content);
        console.log("msgAndImageJson", msgAndImageJson);
        const lastAssistantMessage = {
          role: "assistant",
          content: msgAndImageJson.message,
          image: msgAndImageJson.image
        };
        setLastAssistantMessage(lastAssistantMessage);
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    }
  }, [messages]);

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
        {/* ft. 
         <span className="text-red-500">Groq</span> and 
        <span className="text-red-500">&nbsp;Pollinations.AI</span> */}
      </h1>

      <div className="flex flex-col  mx-auto pt-2 md:pt-10 pb-32" style={{maxWidth: "800px"}}>
        {/* <div className="text-center mb-4" style={{ fontSize: "1.5rem" }}>{displayedTranscript}</div> */}
        {lastAssistantMessage && <LastAssistantMessage message={lastAssistantMessage} />}
        <div ref={messagesEndRef} />

        <form
          ref={formRef}
          onSubmit={(e) => {
            handleSubmit(e);
            formRef.current?.reset();
          }}
          className="flex items-start justify-center">
          <input
            className="rounded-full p-4 w-full border-2 border-gray-700 bg-gray-800 fixed bottom-10 left-0 right-0 z-10 m-auto max-w-xs md:max-w-2xl placeholder:text-sm text-white"
            value={input || displayedTranscript || ""}
            placeholder="Say something..."
            onChange={handleInputChange}
          />
          {/* <button
            type="button"
            onClick={handleVoiceInput}
            className="ml-2 p-2 bg-blue-500 text-white rounded-full">
            {listening ? "Listening..." : "Speak"}
          </button> */}
        </form>
      </div>
      <label className="fixed bottom-10 right-10 text-sm bg-gray-800 p-2 rounded-full">
        <input
          type="checkbox"
          checked={enableSpeech}
          onChange={handleCheckboxChange}
          className="mr-1"
        />
        Listen
      </label>
    </main>
  )
}
