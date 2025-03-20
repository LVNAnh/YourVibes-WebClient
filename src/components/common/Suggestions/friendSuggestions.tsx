import React, { useState } from "react";
import { Avatar, Button, Card, Dropdown, Menu, Modal } from "antd";
import { useRouter } from "next/navigation";
import { UsergroupAddOutlined, MoreOutlined } from "@ant-design/icons";

interface FriendSuggestionsProps {
    friendSuggestions?: Array<{
        id: string;
        avatar_url: string;
        family_name: string;
        name: string;
    }>;
    postIndex: number;
}

const mockFriendSuggestions = [
    { id: "1", avatar_url: "https://th.bing.com/th/id/OIP.QZIRZKUSWt1HBifjDRKGzAHaFj?rs=1&pid=ImgDetMain", family_name: "Nguyễn", name: "A" },
    { id: "2", avatar_url: "https://th.bing.com/th/id/OIP.QZIRZKUSWt1HBifjDRKGzAHaFj?rs=1&pid=ImgDetMain", family_name: "Trần", name: "B" },
    { id: "3", avatar_url: "https://th.bing.com/th/id/OIP.QZIRZKUSWt1HBifjDRKGzAHaFj?rs=1&pid=ImgDetMain", family_name: "Lê", name: "C" },
    { id: "4", avatar_url: "https://th.bing.com/th/id/OIP.QZIRZKUSWt1HBifjDRKGzAHaFj?rs=1&pid=ImgDetMain", family_name: "Phạm", name: "D" },
    { id: "5", avatar_url: "https://th.bing.com/th/id/OIP.QZIRZKUSWt1HBifjDRKGzAHaFj?rs=1&pid=ImgDetMain", family_name: "Nguyễn", name: "E" },
    { id: "6", avatar_url: "https://th.bing.com/th/id/OIP.QZIRZKUSWt1HBifjDRKGzAHaFj?rs=1&pid=ImgDetMain", family_name: "Trần", name: "F" },
];

const FriendSuggestions: React.FC<FriendSuggestionsProps> = ({ friendSuggestions = mockFriendSuggestions, postIndex }) => {
    const router = useRouter();
    const [isModalVisible, setIsModalVisible] = useState(false);

    const showModal = () => {
        setIsModalVisible(true);
    };

    const handleOk = () => {
        setIsModalVisible(false);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const menu = (
        <Menu>
            <Menu.Item key="1">Tại sao tôi lại thấy những người bạn này</Menu.Item>
            <Menu.Item key="2">Tôi không muốn thấy những người bạn này</Menu.Item>
        </Menu>
    );

    if (postIndex >= 5) {
        return null;
    }

    return (
        <div style={{ width: "100%", padding: "15px", backgroundColor: "#fff", marginTop: "10px", borderRadius: "10px", boxShadow: "0px 2px 5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <UsergroupAddOutlined style={{ fontSize: "18px", marginRight: "8px" }} />
                    <h3 style={{ margin: 0, fontWeight: "bold" }}>Những người bạn có thể biết</h3>
                </div>
                <Dropdown overlay={menu} trigger={["click"]}>
                    <MoreOutlined style={{ fontSize: "20px", cursor: "pointer" }} />
                </Dropdown>
            </div>

            <div style={{ display: "flex", overflowX: "auto", gap: "10px" }}>
                {friendSuggestions.map((suggestion) => (
                    <Card key={suggestion.id} hoverable style={{ width: 150, textAlign: "center", borderRadius: "10px", padding: "10px", flexShrink: 0 }}>
                        <Avatar src={suggestion.avatar_url} size={64} style={{ marginBottom: "10px" }} />
                        <p style={{ fontWeight: "bold", margin: "5px 0" }}>{suggestion.family_name} {suggestion.name}</p>
                        <Button type="primary" block style={{ marginBottom: "5px" }}>Kết Bạn</Button>
                        <Button block>Gỡ</Button>
                    </Card>
                ))}
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
                <Button type="link" onClick={showModal} style={{ color: "black" }}>Xem thêm</Button>
            </div>

            <Modal title="Những người bạn có thể biết" visible={isModalVisible} onOk={handleOk} onCancel={handleCancel}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    {friendSuggestions.map((suggestion) => (
                        <Card key={suggestion.id} hoverable style={{ width: 150, textAlign: "center", borderRadius: "10px", padding: "10px" }}>
                            <Avatar src={suggestion.avatar_url} size={64} style={{ marginBottom: "10px" }} />
                            <p style={{ fontWeight: "bold", margin: "5px 0" }}>{suggestion.family_name} {suggestion.name}</p>
                            <Button type="primary" block style={{ marginBottom: "5px" }}>Kết Bạn</Button>
                            <Button block>Gỡ</Button>
                        </Card>
                    ))}
                </div>
            </Modal>
        </div>
    );
};

export default FriendSuggestions;