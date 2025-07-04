import React from "react";
import { FileText, Settings, Headphones } from "lucide-react";

const steps = [
  {
    icon: <FileText className="w-6 h-6 text-white" />,
    title: "1. Upload The Book",
    description:
      "Upload your manuscript in PDF, EPUB, or TXT format. Our platform supports multiple file types and ensures a smooth upload process to get your audiobook started.",
  },
  {
    icon: <Settings className="w-6 h-6 text-white" />,
    title: "2. Choose Voices & Languages",
    description:
      "Pick from a wide variety of natural-sounding AI voices across different accents and languages. Customize tone, pitch, and speed to match your desired listening experience.",
  },
  {
    icon: <Headphones className="w-6 h-6 text-white" />,
    title: "3. Generate & Listen",
    description:
      "Once you're satisfied with your settings, click 'Generate' to create your audiobook. You can listen to a preview and make adjustments as needed before finalizing.",
  },
];

const HowtoUse = () => {
  return (
    <section className="bg-white py-16 px-4 md:px-20">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">
          How to Use Our Audiobook Maker
        </h2>
        <p className="text-gray-600 mb-12">
          Follow these simple steps to convert your text into immersive audio.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-black rounded-2xl text-white p-6 shadow-xl"
            >
              <div className="mb-4 p-3 bg-gray-800 rounded-full inline-block">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-gray-300 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowtoUse;
