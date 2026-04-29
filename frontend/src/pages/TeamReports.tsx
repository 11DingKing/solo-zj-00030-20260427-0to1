import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useAuthStore } from "../store/authStore";
import {
  teamApi,
  dailyReportApi,
  weeklyReportApi,
  commentApi,
} from "../services/api";
import {
  Team,
  DailyReport as DailyReportType,
  WeeklyReport as WeeklyReportType,
  Comment,
  TeamMember,
} from "../types";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";

const TeamReports: React.FC = () => {
  const { user } = useAuthStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [reportType, setReportType] = useState<"daily" | "weekly">("daily");
  const [startDate, setStartDate] = useState<string>(
    format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [reports, setReports] = useState<
    DailyReportType[] | WeeklyReportType[]
  >([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedReport, setSelectedReport] = useState<
    DailyReportType | WeeklyReportType | null
  >(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReportDetail, setShowReportDetail] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await teamApi.getTeams();
        setTeams(res.data);
        if (res.data.length > 0) {
          setSelectedTeam(res.data[0].id);
        }
      } catch (error) {
        toast.error("获取团队列表失败");
      }
    };

    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      fetchMembers();
      fetchReports();
    }
  }, [selectedTeam, reportType, startDate, endDate, selectedMember]);

  const fetchMembers = async () => {
    try {
      const res = await teamApi.getTeam(selectedTeam);
      if (res.data.members) {
        setMembers(res.data.members);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params: any = { startDate, endDate };
      if (selectedMember) {
        params.userId = selectedMember;
      }

      let res;
      if (reportType === "daily") {
        res = await dailyReportApi.getTeamReports(selectedTeam, params);
      } else {
        res = await weeklyReportApi.getTeamReports(selectedTeam, params);
      }

      if (Array.isArray(res.data)) {
        setReports(res.data);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async (
    report: DailyReportType | WeeklyReportType,
  ) => {
    setSelectedReport(report);
    setShowReportDetail(true);

    try {
      const res = await commentApi.get(reportType, report.id);
      if (Array.isArray(res.data)) {
        setComments(res.data);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      setComments([]);
    }
  };

  const handleSubmitComment = async () => {
    if (!selectedReport || !newComment.trim()) return;

    const mentionPattern = /@(\w+)/g;
    const matches = [...newComment.matchAll(mentionPattern)];
    const mentions = matches.map((m) => m[1]);

    try {
      await commentApi.create({
        reportId: selectedReport.id,
        reportType,
        content: newComment,
        mentions,
      });
      setNewComment("");
      setMentionSearch("");
      toast.success("评论已添加");

      const res = await commentApi.get(reportType, selectedReport.id);
      if (Array.isArray(res.data)) {
        setComments(res.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "添加评论失败");
    }
  };

  const handleCommentInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const value = e.target.value;
    setNewComment(value);

    const lines = value.split("\n");
    const lastLine = lines[lines.length - 1];
    const lastAtIndex = lastLine.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const searchText = lastLine.slice(lastAtIndex + 1).toLowerCase();
      setMentionSearch(searchText);
      setShowMemberDropdown(searchText.length > 0);
    } else {
      setShowMemberDropdown(false);
      setMentionSearch("");
    }
  };

  const handleMentionSelect = (username: string) => {
    const lines = newComment.split("\n");
    const lastLine = lines[lines.length - 1];
    const lastAtIndex = lastLine.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      lines[lines.length - 1] =
        lastLine.slice(0, lastAtIndex + 1) + username + " ";
      setNewComment(lines.join("\n"));
    }

    setShowMemberDropdown(false);
    setMentionSearch("");
  };

  const filteredMembers = members.filter(
    (m) =>
      m.username.toLowerCase().includes(mentionSearch) ||
      (m.name && m.name.toLowerCase().includes(mentionSearch)),
  );

  const renderReportRow = (
    report: DailyReportType | WeeklyReportType,
    index: number,
  ) => {
    const isDaily = reportType === "daily";
    const dailyReport = report as DailyReportType;
    const weeklyReport = report as WeeklyReportType;

    return (
      <tr key={report.id}>
        <td style={{ fontWeight: 600 }}>
          {report.user_name || report.username}
        </td>
        <td>
          {isDaily
            ? format(new Date(dailyReport.report_date), "yyyy-MM-dd", {
                locale: zhCN,
              })
            : `${format(new Date(weeklyReport.week_start), "MM/dd", { locale: zhCN })} - ${format(new Date(weeklyReport.week_end), "MM/dd", { locale: zhCN })}`}
        </td>
        <td>
          <span
            className={`badge ${report.status === "submitted" ? "badge-success" : "badge-warning"}`}
          >
            {report.status === "submitted" ? "已提交" : "草稿"}
          </span>
        </td>
        <td>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleViewReport(report)}
          >
            查看详情
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">团队报告</h1>
        <p className="page-subtitle">查看和管理团队成员的日报周报</p>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-body">
          <div
            className="grid grid-cols-2 gap-4"
            style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">团队</label>
              <select
                className="form-input"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="">请选择</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">报告类型</label>
              <select
                className="form-input"
                value={reportType}
                onChange={(e) =>
                  setReportType(e.target.value as "daily" | "weekly")
                }
              >
                <option value="daily">日报</option>
                <option value="weekly">周报</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">开始日期</label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">结束日期</label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">成员筛选</label>
              <select
                className="form-input"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
              >
                <option value="">全部成员</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || member.username}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div
          className="card-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ fontWeight: 600 }}>
            {reportType === "daily" ? "日报列表" : "周报列表"}
            {reports.length > 0 && (
              <span
                style={{
                  fontSize: "0.875rem",
                  color: "var(--gray-500)",
                  fontWeight: 400,
                }}
              >
                {" "}
                ({reports.length} 条记录)
              </span>
            )}
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={fetchReports}>
            🔄 刷新
          </button>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "3rem",
              }}
            >
              <div className="loading-spinner"></div>
            </div>
          ) : reports.length === 0 ? (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "var(--gray-500)",
              }}
            >
              该时间范围内暂无报告
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>提交人</th>
                  <th>{reportType === "daily" ? "日期" : "周范围"}</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, index) => renderReportRow(report, index))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showReportDetail && selectedReport && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowReportDetail(false)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="card-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ fontWeight: 600 }}>
                  {selectedReport.user_name || selectedReport.username} 的
                  {reportType === "daily" ? "日报" : "周报"}
                </h3>
                <span
                  className={`badge mt-2 ${selectedReport.status === "submitted" ? "badge-success" : "badge-warning"}`}
                >
                  {selectedReport.status === "submitted" ? "已提交" : "草稿"}
                </span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowReportDetail(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <div className="card-body">
                {reportType === "daily" ? (
                  <>
                    {(selectedReport as DailyReport).today_completed && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                          今日完成：
                        </p>
                        <div
                          className="markdown-content"
                          style={{
                            padding: "1rem",
                            background: "var(--gray-50)",
                            borderRadius: "var(--border-radius)",
                          }}
                        >
                          <ReactMarkdown>
                            {
                              (selectedReport as DailyReportType)
                                .today_completed
                            }
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {(selectedReport as DailyReportType).tomorrow_plan && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                          明日计划：
                        </p>
                        <div
                          className="markdown-content"
                          style={{
                            padding: "1rem",
                            background: "var(--gray-50)",
                            borderRadius: "var(--border-radius)",
                          }}
                        >
                          <ReactMarkdown>
                            {(selectedReport as DailyReportType).tomorrow_plan}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {(selectedReport as DailyReportType).problems && (
                      <div>
                        <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                          遇到的问题：
                        </p>
                        <div
                          className="markdown-content"
                          style={{
                            padding: "1rem",
                            background: "var(--gray-50)",
                            borderRadius: "var(--border-radius)",
                          }}
                        >
                          <ReactMarkdown>
                            {(selectedReport as DailyReportType).problems}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {(selectedReport as WeeklyReportType).summary && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                          本周总结：
                        </p>
                        <div
                          className="markdown-content"
                          style={{
                            padding: "1rem",
                            background: "var(--gray-50)",
                            borderRadius: "var(--border-radius)",
                          }}
                        >
                          <ReactMarkdown>
                            {(selectedReport as WeeklyReportType).summary}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {(selectedReport as WeeklyReportType).next_week_plan && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                          下周计划：
                        </p>
                        <div
                          className="markdown-content"
                          style={{
                            padding: "1rem",
                            background: "var(--gray-50)",
                            borderRadius: "var(--border-radius)",
                          }}
                        >
                          <ReactMarkdown>
                            {
                              (selectedReport as WeeklyReportType)
                                .next_week_plan
                            }
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {(selectedReport as WeeklyReportType)
                      .coordination_needed && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                          需要协调的事项：
                        </p>
                        <div
                          className="markdown-content"
                          style={{
                            padding: "1rem",
                            background: "var(--gray-50)",
                            borderRadius: "var(--border-radius)",
                          }}
                        >
                          <ReactMarkdown>
                            {
                              (selectedReport as WeeklyReportType)
                                .coordination_needed
                            }
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {(selectedReport as WeeklyReportType).work_hours &&
                      (selectedReport as WeeklyReportType).work_hours!.length >
                        0 && (
                        <div>
                          <p
                            style={{ fontWeight: 600, marginBottom: "0.5rem" }}
                          >
                            工时统计：
                          </p>
                          <table className="work-hours-table">
                            <thead>
                              <tr>
                                <th>项目</th>
                                <th>周一</th>
                                <th>周二</th>
                                <th>周三</th>
                                <th>周四</th>
                                <th>周五</th>
                                <th>合计</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(
                                selectedReport as WeeklyReportType
                              ).work_hours!.map((entry) => (
                                <tr key={entry.project_id}>
                                  <td style={{ textAlign: "left" }}>
                                    {entry.project_name}
                                  </td>
                                  <td>{entry.hours.monday || 0}</td>
                                  <td>{entry.hours.tuesday || 0}</td>
                                  <td>{entry.hours.wednesday || 0}</td>
                                  <td>{entry.hours.thursday || 0}</td>
                                  <td>{entry.hours.friday || 0}</td>
                                  <td style={{ fontWeight: 600 }}>
                                    {Object.values(entry.hours).reduce(
                                      (sum, h) => sum + (h || 0),
                                      0,
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                  </>
                )}
              </div>

              <div style={{ borderTop: "1px solid var(--gray-200)" }}>
                <div className="card-body" style={{ paddingBottom: "0.5rem" }}>
                  <h4 style={{ fontWeight: 600, marginBottom: "1rem" }}>
                    评论 ({comments.length})
                  </h4>
                </div>

                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {comments.length === 0 ? (
                    <div
                      style={{
                        padding: "1rem",
                        textAlign: "center",
                        color: "var(--gray-500)",
                      }}
                    >
                      暂无评论
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="comment">
                        <div className="comment-header">
                          <div className="avatar">
                            {comment.user_name?.[0] ||
                              comment.username?.[0] ||
                              "U"}
                          </div>
                          <div>
                            <span className="comment-author">
                              {comment.user_name || comment.username}
                            </span>
                            <span
                              className="comment-time"
                              style={{ marginLeft: "0.5rem" }}
                            >
                              {format(
                                new Date(comment.created_at),
                                "yyyy-MM-dd HH:mm",
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="comment-content">
                          {comment.content.replace(
                            /@(\w+)/g,
                            '<span class="mention">@$1</span>',
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="card-footer">
              <div style={{ position: "relative" }}>
                <textarea
                  className="form-input"
                  placeholder="添加评论... (输入 @ 可以提及其他成员)"
                  value={newComment}
                  onChange={handleCommentInputChange}
                  style={{ minHeight: "80px" }}
                />
                {showMemberDropdown && filteredMembers.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: 0,
                      right: 0,
                      background: "var(--white)",
                      border: "1px solid var(--gray-200)",
                      borderRadius: "var(--border-radius)",
                      boxShadow: "var(--shadow-lg)",
                      zIndex: 100,
                      maxHeight: "200px",
                      overflowY: "auto",
                    }}
                  >
                    {filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        style={{
                          padding: "0.75rem 1rem",
                          cursor: "pointer",
                          borderBottom: "1px solid var(--gray-100)",
                        }}
                        onClick={() => handleMentionSelect(member.username)}
                      >
                        <div style={{ fontWeight: 600 }}>
                          {member.name || member.username}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--gray-500)",
                          }}
                        >
                          @{member.username}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div
                style={{
                  marginTop: "0.75rem",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                >
                  发送评论
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamReports;
