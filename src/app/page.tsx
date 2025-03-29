import {DatabaseSetup} from "@/components/database-setup";
import {DocumentSourceSelector} from "@/components/document-source-selector";
import {DocumentUploader} from "@/components/document-uploader";
import {ChatInterface} from "@/components/chat-interface";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container mx-auto py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Document RAG System</h1>
          {process.env.NODE_ENV === "development" && <DatabaseSetup />}
        </div>
      </header>
      <main className="flex-1 container mx-auto py-6 px-4 grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="space-y-6">
          <div className="border rounded-lg p-4 space-y-4">
            <h2 className="text-lg font-medium">Document Sources</h2>
            <DocumentSourceSelector />
          </div>
          <div className="border rounded-lg p-4 space-y-4">
            <h2 className="text-lg font-medium">Upload Documents</h2>
            <DocumentUploader />
          </div>
        </div>
        <div className="border rounded-lg p-4 h-[calc(100vh-200px)] flex flex-col">
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}
