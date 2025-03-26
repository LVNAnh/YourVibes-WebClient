import React from 'react';
import { Modal } from 'antd';
import { ErrorModalProps } from '../../../types/messageTypes';

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, errorMessage, onClose, localStrings }) => {
  return (
    <Modal
      title={localStrings.Messages.Error || "Lỗi"}
      open={isOpen}
      onCancel={onClose}
      footer={[
        <button
          key="ok"
          onClick={onClose}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          {localStrings.Messages.OK || "OK"}
        </button>
      ]}
    >
      <p>{errorMessage}</p>
    </Modal>
  );
};

export default ErrorModal;