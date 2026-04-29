import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { notificationApi } from "../services/api";
import { Notification } from "../types";
import toast from "react-hot-toast";

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter === "unread") {
        params.isRead = false;
      }
      const res = await notificationApi.get(params);
      const data = res.data;
      if (data && typeof data === "object" && "notifications" in data) {
        setNotifications(
          Array.isArray(data.notifications) ? data.notifications : [],
        );
      } else if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
      toast.success("已标记为已读");
    } catch (error) {
      toast.error("操作失败");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      toast.success("已全部标记为已读");
    } catch (error) {
      toast.error("操作失败");
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!window.confirm("确定要删除这条通知吗？")) return;

    try {
      await notificationApi.delete(notificationId);
      setNotifications(notifications.filter((n) => n.id !== notificationId));
      toast.success("已删除");
    } catch (error) {
      toast.error("删除失败");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "mention":
        return "@";
      case "comment":
        return "💬";
      case "reminder":
        return "⏰";
      case "system":
        return "🔔";
      default:
        return "📢";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "mention":
        return "提及";
      case "comment":
        return "评论";
      case "reminder":
        return "提醒";
      case "system":
        return "系统";
      default:
        return "通知";
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "mention":
        return "badge-info";
      case "comment":
        return "badge-success";
      case "reminder":
        return "badge-warning";
      case "system":
        return "badge-secondary";
      default:
        return "badge-secondary";
    }
  };

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">通知中心</h1>
        <p className="page-subtitle">查看和管理您的通知</p>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter("all")}
          >
            全部
          </button>
          <button
            className={`btn btn-sm ${filter === "unread" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter("unread")}
          >
            未读
            {unreadCount > 0 && (
              <span
                style={{
                  marginLeft: "0.25rem",
                  background: "var(--danger-color)",
                  color: "white",
                  borderRadius: "9999px",
                  padding: "0 0.375rem",
                  fontSize: "0.75rem",
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        {unreadCount > 0 && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleMarkAllAsRead}
          >
            全部标记为已读
          </button>
        )}
      </div>

      {loading ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
        >
          <div className="loading-spinner"></div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔔</p>
          <h3 style={{ marginBottom: "0.5rem" }}>
            {filter === "unread" ? "暂无未读通知" : "暂无通知"}
          </h3>
          <p style={{ color: "var(--gray-500)" }}>
            {filter === "unread"
              ? "您的所有通知都已阅读"
              : "当有新消息时会在这里显示"}
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  padding: "1rem 1.5rem",
                  borderBottom: "1px solid var(--gray-100)",
                  background: notification.is_read
                    ? "var(--white)"
                    : "rgba(59, 130, 246, 0.03)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", gap: "1rem", flex: 1 }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "var(--border-radius)",
                      background: notification.is_read
                        ? "var(--gray-100)"
                        : "var(--primary-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.25rem",
                      flexShrink: 0,
                    }}
                  >
                    {getTypeIcon(notification.type)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {!notification.is_read && (
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "var(--primary-color)",
                          }}
                        ></div>
                      )}
                      <h4
                        style={{ fontWeight: notification.is_read ? 500 : 600 }}
                      >
                        {notification.title}
                      </h4>
                      <span
                        className={`badge ${getTypeBadgeClass(notification.type)}`}
                        style={{ fontSize: "0.65rem" }}
                      >
                        {getTypeLabel(notification.type)}
                      </span>
                    </div>

                    {notification.content && (
                      <p
                        style={{
                          color: "var(--gray-600)",
                          marginBottom: "0.5rem",
                          fontSize: "0.875rem",
                        }}
                      >
                        {notification.content}
                      </p>
                    )}

                    <p
                      style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}
                    >
                      {format(
                        new Date(notification.created_at),
                        "yyyy年MM月dd日 HH:mm",
                        {
                          locale: zhCN,
                        },
                      )}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  {!notification.is_read && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleMarkAsRead(notification.id)}
                      title="标记为已读"
                    >
                      已读
                    </button>
                  )}
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(notification.id)}
                    title="删除"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: "1.5rem" }}>
        <div className="card-header">
          <h3 style={{ fontWeight: 600 }}>通知类型说明</h3>
        </div>
        <div className="card-body">
          <div
            className="grid grid-cols-2 gap-4"
            style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
          >
            <div
              style={{
                padding: "1rem",
                background: "var(--gray-50)",
                borderRadius: "var(--border-radius)",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                @
              </div>
              <p style={{ fontWeight: 600 }}>提及</p>
              <p style={{ fontSize: "0.875rem", color: "var(--gray-500)" }}>
                当您在评论中被 @ 提到时收到
              </p>
            </div>
            <div
              style={{
                padding: "1rem",
                background: "var(--gray-50)",
                borderRadius: "var(--border-radius)",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                💬
              </div>
              <p style={{ fontWeight: 600 }}>评论</p>
              <p style={{ fontSize: "0.875rem", color: "var(--gray-500)" }}>
                当您的报告收到新评论时
              </p>
            </div>
            <div
              style={{
                padding: "1rem",
                background: "var(--gray-50)",
                borderRadius: "var(--border-radius)",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                ⏰
              </div>
              <p style={{ fontWeight: 600 }}>提醒</p>
              <p style={{ fontSize: "0.875rem", color: "var(--gray-500)" }}>
                日报周报提交截止提醒
              </p>
            </div>
            <div
              style={{
                padding: "1rem",
                background: "var(--gray-50)",
                borderRadius: "var(--border-radius)",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                🔔
              </div>
              <p style={{ fontWeight: 600 }}>系统</p>
              <p style={{ fontSize: "0.875rem", color: "var(--gray-500)" }}>
                系统消息和重要公告
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
