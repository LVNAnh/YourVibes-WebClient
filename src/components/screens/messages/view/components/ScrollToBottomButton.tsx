import React from 'react';
import { CiCircleChevDown } from "react-icons/ci";
import { ScrollToBottomButtonProps } from '../../types/messageTypes';

const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({ visible, onClick, localStrings }) => {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className="absolute bottom-16 md:bottom-20 md:mb-2 right-6 md:right-12 p-1 md:p-2 bg-white border border-gray-300 rounded-full shadow-md hover:bg-gray-200"
      title={localStrings.Messages.ScrollToBottom}
    >
      <CiCircleChevDown className="text-xl md:text-2xl text-gray-700" />
    </button>
  );
};

export default ScrollToBottomButton;