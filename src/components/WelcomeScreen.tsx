import React from 'react';

interface WelcomeScreenProps {
  onExampleClick: (prompt: string) => void;
}

const examplePrompts = [
    'How do I handle a RealScout lead?',
    'What\'s the process for delayed marketing in BCS?',
    'Tell me about delayed marketing.',
    'Where is the FUB SOP?'
];

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onExampleClick }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <img src="https://assets.agentfire3.com/uploads/sites/1849/2024/10/favicon.png" alt="SJG SOP Assistant Logo" className="w-20 h-20 mb-4" />
        <h1 className="text-4xl font-bold text-[#000000] mb-2">SJG SOP Assistant</h1>
        <p className="text-gray-600 mb-12">Your internal guide for Standard Operating Procedures.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
            {examplePrompts.map((prompt, index) => (
                <button
                    key={index}
                    onClick={() => onExampleClick(prompt)}
                    className="bg-white hover:bg-[#E7E6E2] text-[#000000] p-4 rounded-lg text-left transition-colors border border-[#E7E6E2]"
                >
                    <p className="font-semibold">{prompt}</p>
                </button>
            ))}
        </div>
    </div>
  );
};

export default WelcomeScreen;
