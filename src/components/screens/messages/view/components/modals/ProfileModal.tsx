import React from 'react';
import { Modal } from 'antd';
import { ProfileModalProps } from '../../../types/messageTypes';

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, profile, onClose, localStrings }) => {
  return (
    <Modal
      title={localStrings.Messages.UserProfile}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      styles={{ 
        body: { padding: '20px' },
        mask: { background: 'rgba(0, 0, 0, 0.6)' },
        content: { 
          width: '90%', 
          maxWidth: '400px',
          margin: '0 auto' 
        }
      }}
    >
      {profile ? (
        <div className="flex flex-col items-center p-2 md:p-4">
          <img
            src={profile.avatar_url || "https://via.placeholder.com/100"}
            alt="Avatar"
            className="w-16 h-16 md:w-24 md:h-24 rounded-full border border-gray-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/100";
            }}
          />
          <h3 className="mt-2 text-base md:text-lg font-bold">{profile.family_name} {profile.name}</h3>
          <p className="text-sm md:text-base text-gray-600">{profile.email}</p>
          <div className="w-full mt-4">
            <button
              className="w-full py-1 md:py-2 border border-black text-black rounded-md hover:bg-gray-100 text-sm md:text-base"
              onClick={() => window.open(`/user/${profile.id}`, "_parent")}
            >
              {localStrings.Messages.ProfilePage}
            </button>
            <button
              className="w-full py-1 md:py-2 mt-2 border border-black text-black rounded-md hover:bg-gray-100 text-sm md:text-base"
              onClick={() => alert("Tính năng chặn chưa được triển khai")}
            >
              {localStrings.Messages.Block}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm md:text-base">Đang tải thông tin...</p>
      )}
    </Modal>
  );
};

export default ProfileModal;