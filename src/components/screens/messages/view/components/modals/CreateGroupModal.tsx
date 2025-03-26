import React from 'react';
import { Modal } from 'antd';
import { CreateGroupModalProps } from '../../../types/messageTypes';

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  friends,
  selectedFriends,
  groupSearch,
  onClose,
  onSearchChange,
  onFriendSelect,
  onCreateGroup,
  localStrings
}) => {
  const filteredFriends = friends.filter((friend) => {
    const fullName = `${friend.family_name || ""} ${friend.name || ""}`.toLowerCase();
    return fullName.includes(groupSearch.toLowerCase());
  });

  return (
    <Modal
      title={localStrings.Messages.CreateChatGroup}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      styles={{ 
        body: { padding: '20px' },
        mask: { background: 'rgba(0, 0, 0, 0.6)' },
        content: { 
          width: '90%', 
          maxWidth: '500px',
          margin: '0 auto' 
        }
      }}
    >
      <input
        type="text"
        value={groupSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={localStrings.Messages.FindFriendInModal}
        className="w-full p-2 border rounded-lg mb-4 text-sm md:text-base"
      />
      <div className="mb-4 text-sm text-gray-600">
        {localStrings.Messages.GroupSelectionInfo || "Chọn ít nhất 2 người bạn để tạo nhóm chat"}
        <div className="font-bold mt-1">
          {localStrings.Messages.SelectedFriends || "Đã chọn"}: {selectedFriends.length}/
          {localStrings.Messages.MinimumFriends || "Tối thiểu"}: 2
        </div>
      </div>
      <ul className="max-h-40 md:max-h-60 overflow-y-auto mb-4">
        {filteredFriends.map((friend, index) => {
          const fullName = `${friend.family_name || ""} ${friend.name || ""}`;
          return (
            <li
              key={index}
              onClick={() => onFriendSelect(friend.id || "")}
              className="flex items-center p-2 cursor-pointer hover:bg-gray-100"
            >
              <input
                type="checkbox"
                id={`friend-checkbox-${friend.id}`}
                checked={selectedFriends.includes(friend.id || "")}
                onChange={() => {}}
                onClick={(e) => e.stopPropagation()}
                className="mr-2"
                title={`Chọn ${fullName} vào nhóm chat`}
              />
              <img 
                src={friend.avatar_url} 
                alt={fullName} 
                className="w-6 h-6 md:w-8 md:h-8 rounded-full mr-2" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/32";
                }}
              />
              <span className="text-sm md:text-base">{fullName}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-2 py-1 md:px-4 md:py-2 rounded-lg border border-gray-400 text-gray-700 text-sm md:text-base"
        >
          {localStrings.Messages.Cancel}
        </button>
        <button
          onClick={onCreateGroup}
          disabled={selectedFriends.length < 2}
          className={`px-2 py-1 md:px-4 md:py-2 rounded-lg text-white text-sm md:text-base ${
            selectedFriends.length < 2 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {localStrings.Messages.Confirm}
        </button>
      </div>
    </Modal>
  );
};

export default CreateGroupModal;