import React from 'react';
import { VoiceProgressLogger } from '../components/ai';
import { SyllabusAIHelper } from '../components/syllabus';

export default function AITest() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">AI Features Test Page</h1>
      
      <VoiceProgressLogger 
        courseId="geo6"
        sectionId="6A"
        onUpdate={(data) => console.log('Progress updated:', data)}
      />
      
      <SyllabusAIHelper
        subject="Geography"
        grade={6}
        chapterTitle="Landforms of the Earth"
        topicTitle="Mountains and Plateaus"
        onGenerated={(result) => console.log('AI generated:', result)}
      />
    </div>
  );
}