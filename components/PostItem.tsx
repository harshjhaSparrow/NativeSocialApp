import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, Dimensions, Linking } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Calendar, Clock, DollarSign, Edit, ExternalLink, Heart, MapPin, MessageCircle, Navigation, PartyPopper, Send, Trash2, UserPlus, Users } from "lucide-react-native";
import { api } from "../services/api";
import { useUserLocation } from "./LocationGuard";
import { calculateDistance } from "../util/location";
import { colors, typography, spacing, radii } from "../constants/theme";

const { width } = Dimensions.get('window');

const PostItem: React.FC<any> = ({
    post,
    currentUserId,
    onLike,
    onAddComment,
    onDelete,
    onEdit,
}) => {
    const router = useRouter();
    const { location: myLocation } = useUserLocation();
    const [showAllComments, setShowAllComments] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);
    const [joinLoading, setJoinLoading] = useState(false);
    const [requestSent, setRequestSent] = useState(false);

    const isLiked = currentUserId && post?.likedBy?.includes(currentUserId);
    const commentCount = post?.comments?.length || 0;
    const hasComments = commentCount > 0;
    const commentsToShow = showAllComments
        ? post?.comments
        : hasComments
            ? [post?.comments[post?.comments.length - 1]]
            : [];

    const isMeetup = post?.type === "meetup" && post?.meetupDetails;
    const isHost = currentUserId === post?.uid;
    const isAttendee = currentUserId && post?.attendees?.includes(currentUserId);
    const isPending = currentUserId && post?.pendingRequests?.includes(currentUserId);

    const handleSubmitComment = async () => {
        if (!post?._id || !commentText.trim()) return;
        setSubmittingComment(true);
        try {
            await onAddComment(post?._id, commentText);
            setCommentText("");
            setShowAllComments(true);
        } catch (error) {
            console.error("Failed to add comment", error);
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleJoinRequest = async () => {
        if (!currentUserId || !post?._id) return;
        setJoinLoading(true);
        try {
            await api.meetups.join(post?._id, currentUserId);
            setRequestSent(true);
        } catch (e) {
            console.error("Join failed", e);
        } finally {
            setJoinLoading(false);
        }
    };

    const distance =
        post?.location && myLocation
            ? calculateDistance(
                myLocation?.lat,
                myLocation?.lng,
                post?.location?.lat,
                post?.location?.lng,
            )
            : null;

    return (
        <View style={[styles.card, isMeetup && styles.meetupCard]}>
            {isMeetup && (
                <View style={styles.meetupBadge}>
                    <PartyPopper size={12} color="#fff" />
                    <Text style={styles.meetupBadgeText}>MEET UP</Text>
                </View>
            )}

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerLeft} onPress={() => router.push(`/profile/${post?.uid}`)}>
                    <View style={styles.avatar}>
                        {post?.authorPhoto ? (
                            <Image source={{ uri: post?.authorPhoto }} style={styles.avatarImage} resizeMode="cover" />
                        ) : (
                            <Text style={styles.avatarPlaceholder}>{post?.authorName?.[0] || "U"}</Text>
                        )}
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.authorName}>{post?.authorName}</Text>
                        <View style={styles.dateLocationRow}>
                            <Text style={styles.dateText}>{new Date(post.createdAt).toLocaleDateString()}</Text>
                            {post?.location && (
                                <View style={styles.locationWrapper}>
                                    <Text style={styles.dotSeparator}>•</Text>
                                    <MapPin size={12} color="#64748b" />
                                    <Text style={styles.locationText}>{post?.location?.name || "Unknown"}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Action Buttons */}
                <View style={styles.headerRight}>
                    {distance && (
                        <View style={styles.distanceBadge}>
                            <Navigation size={12} color="#60a5fa" />
                            <Text style={styles.distanceText}>{distance}</Text>
                        </View>
                    )}

                    {onEdit && (
                        <TouchableOpacity onPress={() => onEdit(post?._id)} style={styles.iconButton}>
                            <Edit size={20} color="#64748b" />
                        </TouchableOpacity>
                    )}

                    {onDelete && (
                        <TouchableOpacity onPress={() => onDelete(post?._id)} style={styles.iconButton}>
                            <Trash2 size={20} color="#64748b" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Content */}
            {isMeetup ? (
                <View style={styles.meetupContent}>
                    {post?.imageURL && (
                        <Image source={{ uri: post?.imageURL }} style={styles.meetupImage} resizeMode="cover" />
                    )}

                    <View style={styles.meetupDetailsBox}>
                        <Text style={styles.meetupTitle}>{post?.meetupDetails?.title}</Text>
                        <View style={styles.activityBadge}>
                            <PartyPopper size={12} color="#60a5fa" />
                            <Text style={styles.activityText}>{post?.meetupDetails?.activity}</Text>
                        </View>

                        <View style={styles.meetupGrid}>
                            <View style={styles.gridItem}>
                                <View style={styles.gridIcon}><Calendar size={16} color="#94a3b8" /></View>
                                <Text style={styles.gridText}>{new Date(post.meetupDetails!.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</Text>
                            </View>
                            <View style={styles.gridItem}>
                                <View style={styles.gridIcon}><Clock size={16} color="#94a3b8" /></View>
                                <Text style={styles.gridText}>{post?.meetupDetails?.startTime} - {post?.meetupDetails?.endTime}</Text>
                            </View>
                            <View style={styles.gridItem}>
                                <View style={styles.gridIcon}><DollarSign size={16} color="#94a3b8" /></View>
                                <Text style={styles.gridText} numberOfLines={1}>
                                    {post?.meetupDetails?.feeType} {post?.meetupDetails?.feeAmount ? `(${post.meetupDetails.feeAmount})` : ''}
                                </Text>
                            </View>
                            {post?.meetupDetails?.maxGuests && (
                                <View style={styles.gridItem}>
                                    <View style={styles.gridIcon}><Users size={16} color="#94a3b8" /></View>
                                    <Text style={styles.gridText}>{post?.meetupDetails?.maxGuests} Max</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.postBody}>{post?.content}</Text>

                        {post?.meetupDetails?.meetingUrl && (
                            <TouchableOpacity onPress={() => Linking.openURL(post.meetupDetails!.meetingUrl!)} style={styles.linkWrapper}>
                                <ExternalLink size={16} color="#60a5fa" />
                                <Text style={styles.linkText} numberOfLines={1}>{post?.meetupDetails?.meetingUrl}</Text>
                            </TouchableOpacity>
                        )}

                        {!isHost ? (
                            <>
                                {isAttendee ? (
                                    <TouchableOpacity onPress={() => router.push(`/chat/group/${post?._id}`)} style={[styles.actionButton, styles.greenButton]}>
                                        <MessageCircle size={16} color="#fff" />
                                        <Text style={styles.actionButtonText}>Open Group Chat</Text>
                                    </TouchableOpacity>
                                ) : isPending || requestSent ? (
                                    <View style={[styles.actionButton, styles.disabledButton]}>
                                        <Clock size={16} color="#94a3b8" />
                                        <Text style={styles.disabledButtonText}>Request Pending</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity onPress={handleJoinRequest} disabled={joinLoading} style={styles.actionButton}>
                                        {joinLoading ? <ActivityIndicator color="#fff" /> : <UserPlus size={16} color="#fff" />}
                                        <Text style={styles.actionButtonText}>Request to Join</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        ) : (
                            <TouchableOpacity onPress={() => router.push(`/post/${post?._id}`)} style={styles.manageButton}>
                                <Text style={styles.manageButtonText}>Manage Guests {post?.pendingRequests?.length ? `(${post?.pendingRequests?.length})` : ""}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            ) : (
                <View>
                    {post?.imageURL && (
                        <Image source={{ uri: post?.imageURL }} style={styles.postImage} resizeMode="cover" />
                    )}
                    <View style={styles.regularContent}>
                        <Text style={styles.postBody}>{post?.content}</Text>
                    </View>
                </View>
            )}

            {/* Footer / Comments */}
            <View style={styles.footer}>
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onLike(post);
                        }}
                        style={styles.likeButton}
                    >
                        <Heart size={24} color={isLiked ? "#3b82f6" : "#64748b"} fill={isLiked ? "#3b82f6" : "transparent"} />
                        <Text style={[styles.actionCount, isLiked && styles.likedText]}>{post?.likes}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowAllComments(!showAllComments)} style={styles.commentButton}>
                        <MessageCircle size={24} color={showAllComments ? "#60a5fa" : "#64748b"} />
                        <Text style={styles.actionCount}>{commentCount}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.commentsSection}>
                    {!showAllComments && commentCount > 1 && (
                        <TouchableOpacity onPress={() => setShowAllComments(true)}>
                            <Text style={styles.viewAllText}>View all {commentCount} comments</Text>
                        </TouchableOpacity>
                    )}

                    {commentsToShow?.length > 0 && (
                        <View style={styles.commentsList}>
                            {commentsToShow.map((comment: any, idx: number) => (
                                <View key={idx} style={styles.commentItem}>
                                    <TouchableOpacity style={styles.commentAvatar} onPress={() => router.push(`/profile/${comment?.uid}` as any)}>
                                        {comment?.authorPhoto ? (
                                            <Image source={{ uri: comment?.authorPhoto }} style={styles.commentAvatarImage} resizeMode="cover" />
                                        ) : (
                                            <Text style={styles.commentAvatarText}>{comment?.authorName?.[0]}</Text>
                                        )}
                                    </TouchableOpacity>
                                    <View style={styles.commentBubble}>
                                        <TouchableOpacity onPress={() => router.push(`/profile/${comment?.uid}` as any)}>
                                            <Text style={styles.commentAuthor}>{comment?.authorName}</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.commentText}>{comment?.text}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.addCommentRow}>
                        <TextInput
                            style={styles.commentInput}
                            value={commentText}
                            onChangeText={setCommentText}
                            placeholder={isMeetup ? "Ask a question..." : "Add a comment..."}
                            placeholderTextColor="#475569"
                            onSubmitEditing={handleSubmitComment}
                        />
                        <TouchableOpacity
                            onPress={handleSubmitComment}
                            disabled={!commentText.trim() || submittingComment}
                            style={styles.sendButton}
                        >
                            {submittingComment ? <ActivityIndicator size="small" color="#3b82f6" /> : <Send size={20} color={!commentText.trim() ? "#475569" : "#3b82f6"} />}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#0f172a',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#1e293b',
        overflow: 'hidden',
        marginBottom: 16,
        position: 'relative',
    },
    meetupCard: {
        borderColor: 'rgba(30, 58, 138, 0.5)',
    },
    meetupBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#2563eb', // primary-600
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderBottomLeftRadius: 16,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    meetupBadgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
        letterSpacing: 1,
    },
    header: {
        flexDirection: 'row',
        padding: 16,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        color: '#3b82f6',
        fontWeight: 'bold',
        fontSize: 16,
    },
    headerInfo: {
        marginLeft: 12,
    },
    authorName: {
        color: '#e2e8f0',
        fontWeight: 'bold',
        fontSize: 14,
    },
    dateLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    dateText: {
        color: '#64748b',
        fontSize: 12,
    },
    locationWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dotSeparator: {
        color: '#64748b',
        fontSize: 12,
        marginHorizontal: 4,
    },
    locationText: {
        color: '#64748b',
        fontSize: 12,
        marginLeft: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.2)',
        marginRight: 8,
    },
    distanceText: {
        color: '#60a5fa',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    iconButton: {
        padding: 8,
    },
    meetupContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    meetupImage: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        marginBottom: 16,
    },
    meetupDetailsBox: {
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
    },
    meetupTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
    },
    activityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(51, 65, 85, 0.5)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 16,
    },
    activityText: {
        color: '#60a5fa',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    meetupGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    gridItem: {
        width: '50%',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    gridIcon: {
        backgroundColor: '#334155',
        padding: 6,
        borderRadius: 8,
        marginRight: 8,
    },
    gridText: {
        color: '#cbd5e1',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    postBody: {
        color: '#94a3b8',
        fontSize: 14,
        lineHeight: 22,
        borderTopWidth: 1,
        borderTopColor: 'rgba(51, 65, 85, 0.5)',
        paddingTop: 12,
        marginBottom: 16,
    },
    linkWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    linkText: {
        color: '#60a5fa',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
        flex: 1,
    },
    actionButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    greenButton: {
        backgroundColor: '#16a34a',
    },
    disabledButton: {
        backgroundColor: '#334155',
    },
    actionButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 8,
    },
    disabledButtonText: {
        color: '#94a3b8',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 8,
    },
    manageButton: {
        backgroundColor: '#334155',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#475569',
    },
    manageButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    postImage: {
        width: '100%',
        aspectRatio: 4 / 5, // Instagram 4:5 ratio for portrait flexibility
        backgroundColor: '#1e293b',
    },
    regularContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    footer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 8,
        marginBottom: 8,
    },
    likeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
        paddingVertical: 8,
    },
    commentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    actionCount: {
        color: '#64748b',
        fontWeight: '500',
        marginLeft: 6,
        fontSize: 14,
    },
    likedText: {
        color: '#3b82f6',
    },
    commentsSection: {
        marginTop: 4,
    },
    viewAllText: {
        color: '#64748b',
        fontWeight: '600',
        fontSize: 12,
        marginBottom: 12,
    },
    commentsList: {
        marginBottom: 12,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1e293b',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#334155',
    },
    commentAvatarImage: {
        width: '100%',
        height: '100%',
    },
    commentAvatarText: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: 'bold',
    },
    commentBubble: {
        flex: 1,
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#1e293b',
    },
    commentAuthor: {
        color: '#e2e8f0',
        fontWeight: 'bold',
        fontSize: 12,
        marginBottom: 2,
    },
    commentText: {
        color: '#94a3b8',
        fontSize: 12,
        lineHeight: 18,
    },
    addCommentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    commentInput: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
        paddingVertical: 8,
        color: '#ffffff',
        fontSize: 14,
    },
    sendButton: {
        padding: 8,
    }
});

export default PostItem;
