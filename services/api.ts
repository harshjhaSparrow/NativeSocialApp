import axios from 'axios';
import { Message, Notification, Post, UserProfile } from "../types";

// For local development on Android Emulator: "http://10.0.2.2:5000/api"
// For local development on iOS Simulator: "http://localhost:5000/api"
// For production / deployed backend: "https://orbyt.strangerchat.space/api"
const API_BASE = "https://orbyt.strangerchat.space/api";

export const api = {
    auth: {
        signup: async (email: string, password: string) => {
            const response = await axios.post(`${API_BASE}/auth/signup`, { email, password });
            return response.data;
        },
        login: async (email: string, password: string) => {
            const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
            return response.data;
        },
        googleLogin: async (email: string, displayName: string, photoURL: string) => {
            const response = await axios.post(`${API_BASE}/auth/google`, { email, displayName, photoURL });
            return response.data;
        },
    },
    profile: {
        get: async (uid: string) => {
            try {
                const response = await axios.get(`${API_BASE}/profile/${uid}`);
                return response.data;
            } catch (error) {
                console.error("Failed to fetch profile:", error);
                throw error;
            }
        },
        getBatch: async (uids: string[]) => {
            try {
                const response = await axios.post(`${API_BASE}/profiles/batch`, { uids });
                return response.data;
            } catch (error) {
                console.error("Failed to fetch batch profiles:", error);
                return [];
            }
        },
        getAllWithLocation: async (viewerUid?: string) => {
            try {
                const url = viewerUid ? `${API_BASE}/profiles?viewerUid=${viewerUid}` : `${API_BASE}/profiles`;
                const response = await axios.get(url);
                return response.data;
            } catch (error) {
                console.error("Failed to fetch profiles:", error);
                return [];
            }
        },
        createOrUpdate: async (uid: string, data: Partial<UserProfile>) => {
            await axios.post(`${API_BASE}/profile/${uid}`, data);
        },
        delete: async (uid: string) => {
            try {
                await axios.delete(`${API_BASE}/profile/${uid}`);
                return true;
            } catch {
                return false;
            }
        },
        recordView: async (viewerUid: string, targetUid: string) => {
            try {
                await axios.post(`${API_BASE}/profile/view`, { viewerUid, targetUid });
            } catch (e) {
                console.error("Failed to record profile view:", e);
            }
        },
        getViewers: async (uid: string) => {
            try {
                const response = await axios.get(`${API_BASE}/profile/views/${uid}`);
                return response.data;
            } catch (e) {
                console.error("Failed to fetch profile viewers:", e);
                return [];
            }
        },
    },
    userAction: {
        block: async (uid: string, targetUid: string) => {
            await axios.post(`${API_BASE}/user/block`, { uid, targetUid });
        },
        unblock: async (uid: string, targetUid: string) => {
            await axios.post(`${API_BASE}/user/unblock`, { uid, targetUid });
        },
        report: async (reporterUid: string, targetUid: string, reason: string, postId?: string) => {
            await axios.post(`${API_BASE}/report`, { reporterUid, targetUid, reason, postId });
        },
    },
    friends: {
        sendRequest: async (fromUid: string, toUid: string, message?: string) => {
            await axios.post(`${API_BASE}/friends/request`, { fromUid, toUid, message });
        },
        acceptRequest: async (userUid: string, requesterUid: string) => {
            await axios.post(`${API_BASE}/friends/accept`, { userUid, requesterUid });
        },
        rejectRequest: async (userUid: string, requesterUid: string) => {
            await axios.post(`${API_BASE}/friends/reject`, { userUid, requesterUid });
        },
        removeFriend: async (uid1: string, uid2: string) => {
            await axios.post(`${API_BASE}/friends/remove`, { uid1, uid2 });
        },
    },
    meetups: {
        join: async (postId: string, uid: string) => {
            await axios.post(`${API_BASE}/meetups/${postId}/join`, { uid });
        },
        accept: async (postId: string, hostUid: string, requesterUid: string) => {
            await axios.post(`${API_BASE}/meetups/${postId}/accept`, { hostUid, requesterUid });
        },
        reject: async (postId: string, hostUid: string, requesterUid: string) => {
            await axios.post(`${API_BASE}/meetups/${postId}/reject`, { hostUid, requesterUid });
        },
        removeAttendee: async (postId: string, hostUid: string, targetUid: string) => {
            await axios.post(`${API_BASE}/meetups/${postId}/remove-attendee`, { hostUid, targetUid });
        },
    },
    chat: {
        send: async (fromUid: string, toUid: string | undefined, text: string, groupId?: string): Promise<Message> => {
            const response = await axios.post(`${API_BASE}/chat/send`, { fromUid, toUid, groupId, text });
            return response.data;
        },
        getHistory: async (uid1: string, uid2: string): Promise<Message[]> => {
            try {
                const response = await axios.get(`${API_BASE}/chat/history/${uid1}/${uid2}`);
                return response.data;
            } catch (error) {
                console.error("Failed to fetch chat history:", error);
                return [];
            }
        },
        getGroupHistory: async (groupId: string): Promise<Message[]> => {
            try {
                const response = await axios.get(`${API_BASE}/chat/history/${groupId}`);
                return response.data;
            } catch (error) {
                console.error("Failed to fetch group history:", error);
                return [];
            }
        },
        getInbox: async (uid: string) => {
            try {
                const response = await axios.get(`${API_BASE}/chat/inbox/${uid}`);
                return response.data;
            } catch (e) {
                console.error("Failed to fetch inbox:", e);
                return [];
            }
        },
        markRead: async (myUid: string, partnerUid?: string, groupId?: string) => {
            try {
                await axios.post(`${API_BASE}/chat/mark-read`, { myUid, partnerUid, groupId });
            } catch (e) {
                console.error("Failed to mark read:", e);
            }
        },
        getUnreadCount: async (uid: string): Promise<number> => {
            try {
                const response = await axios.get(`${API_BASE}/chat/unread-count/${uid}`);
                return response.data.count || 0;
            } catch (e) {
                return 0;
            }
        },
        subscribe: (uid: string, onMessage: (msg: Message) => void) => {
            // WebSocket Subscription for Chat
            // Using the deployed backend WebSocket URL.
            const wsUrl = `wss://orbyt.strangerchat.space?uid=${uid}`;

            let socket: WebSocket | null = null;
            let keepAliveInterval: any;
            let reconnectTimeout: any;
            let isSubscribed = true;

            const connect = () => {
                if (!isSubscribed) return;
                socket = new WebSocket(wsUrl);

                socket.onopen = () => {
                    keepAliveInterval = setInterval(() => {
                        if (socket?.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({ type: "ping" }));
                        }
                    }, 30000);
                };

                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === "ping" || data.type === "pong") return;
                        onMessage(data);
                    } catch (e) {
                        console.error("WS Parse Error", e);
                    }
                };

                socket.onclose = () => {
                    clearInterval(keepAliveInterval);
                    if (isSubscribed) {
                        reconnectTimeout = setTimeout(connect, 3000);
                    }
                };

                socket.onerror = () => {
                    if (socket) socket.close();
                };
            };

            connect();

            return () => {
                isSubscribed = false;
                if (socket) socket.close();
                clearInterval(keepAliveInterval);
                clearTimeout(reconnectTimeout);
            };
        },
    },
    notifications: {
        get: async (uid: string): Promise<Notification[]> => {
            try {
                const response = await axios.get(`${API_BASE}/notifications/${uid}`);
                return response.data;
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
                return [];
            }
        },
        markRead: async (notificationIds: string[]) => {
            try {
                await axios.post(`${API_BASE}/notifications/mark-read`, { notificationIds });
            } catch (e) {
                console.error("Failed to mark notifications read:", e);
            }
        },
        markAllRead: async (uid: string) => {
            try {
                await axios.post(`${API_BASE}/notifications/mark-all-read`, { uid });
            } catch (e) {
                console.error("Failed to mark all notifications read:", e);
            }
        },
        getUnreadCount: async (uid: string): Promise<number> => {
            try {
                const response = await axios.get(`${API_BASE}/notifications/unread-count/${uid}`);
                return response.data.count || 0;
            } catch (e) {
                return 0;
            }
        },
    },
    push: {
        subscribe: async (uid: string, subscription: any) => {
            await axios.post(`${API_BASE}/push/subscribe`, { uid, subscription });
        }
    },
    posts: {
        create: async (postData: Partial<Post>) => {
            await axios.post(`${API_BASE}/posts`, postData);
        },
        getAll: async (viewerUid?: string) => {
            try {
                const url = viewerUid ? `${API_BASE}/posts?viewerUid=${viewerUid}` : `${API_BASE}/posts`;
                const response = await axios.get(url);
                return response.data;
            } catch (error) {
                console.error("Failed to fetch posts:", error);
                return [];
            }
        },
        getUserPosts: async (uid: string) => {
            try {
                const response = await axios.get(`${API_BASE}/posts/user/${uid}`);
                return response.data;
            } catch (error) {
                console.error("Failed to fetch user posts:", error);
                return [];
            }
        },
        getPost: async (postId: string) => {
            try {
                const response = await axios.get(`${API_BASE}/posts/${postId}`);
                return response.data;
            } catch (error) {
                console.error("Failed to fetch post:", error);
                return null;
            }
        },
        updatePost: async (postId: string, uid: string, content: string, imageURL?: string | null) => {
            await axios.put(`${API_BASE}/posts/${postId}`, { uid, content, imageURL });
        },
        deletePost: async (postId: string, uid: string) => {
            await axios.delete(`${API_BASE}/posts/${postId}`, { data: { uid } });
        },
        toggleLike: async (postId: string, uid: string) => {
            const response = await axios.post(`${API_BASE}/posts/${postId}/like`, { uid });
            return response.data;
        },
        addComment: async (postId: string, uid: string, text: string) => {
            const response = await axios.post(`${API_BASE}/posts/${postId}/comment`, { uid, text });
            return response.data;
        },
    },
};
