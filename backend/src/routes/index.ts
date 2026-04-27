import Router from 'koa-router';
import { authMiddleware, requireRole, requireTeamLead } from '../middleware/auth';

import * as authController from '../controllers/authController';
import * as teamController from '../controllers/teamController';
import * as dailyReportController from '../controllers/dailyReportController';
import * as weeklyReportController from '../controllers/weeklyReportController';
import * as commentController from '../controllers/commentController';
import * as notificationController from '../controllers/notificationController';
import * as templateController from '../controllers/templateController';
import * as projectController from '../controllers/projectController';
import * as statsController from '../controllers/statsController';

const router = new Router();

router.get('/health', (ctx) => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authMiddleware, authController.getCurrentUser);

router.get('/users/search', authMiddleware, teamController.searchUsers);

router.get('/teams', authMiddleware, teamController.getTeams);
router.get('/teams/:teamId', authMiddleware, teamController.getTeamById);

router.post('/teams', authMiddleware, requireRole('super_admin'), teamController.createTeam);
router.put('/teams/:teamId', authMiddleware, requireTeamLead, teamController.updateTeam);

router.post('/teams/:teamId/members', authMiddleware, requireTeamLead, teamController.addTeamMember);
router.delete('/teams/:teamId/members/:userId', authMiddleware, requireTeamLead, teamController.removeTeamMember);
router.put('/teams/:teamId/members/:userId/lead', authMiddleware, requireTeamLead, teamController.setTeamLead);

router.post('/daily-reports', authMiddleware, dailyReportController.createOrUpdateDailyReport);
router.get('/daily-reports/:teamId/date/:date', authMiddleware, dailyReportController.getDailyReport);
router.get('/daily-reports/:teamId', authMiddleware, dailyReportController.getTeamDailyReports);
router.get('/daily-reports/id/:reportId', authMiddleware, dailyReportController.getDailyReportById);
router.get('/daily-reports/:teamId/calendar', authMiddleware, dailyReportController.getCalendarView);

router.post('/weekly-reports', authMiddleware, weeklyReportController.createOrUpdateWeeklyReport);
router.get('/weekly-reports/:teamId/week/:weekStart', authMiddleware, weeklyReportController.getWeeklyReport);
router.get('/weekly-reports/:teamId', authMiddleware, weeklyReportController.getTeamWeeklyReports);
router.get('/weekly-reports/id/:reportId', authMiddleware, weeklyReportController.getWeeklyReportById);

router.get('/comments/:reportType/:reportId', authMiddleware, commentController.getComments);
router.post('/comments', authMiddleware, commentController.createComment);
router.put('/comments/:commentId', authMiddleware, commentController.updateComment);
router.delete('/comments/:commentId', authMiddleware, commentController.deleteComment);

router.get('/notifications', authMiddleware, notificationController.getNotifications);
router.get('/notifications/unread-count', authMiddleware, notificationController.getUnreadCount);
router.put('/notifications/:notificationId/read', authMiddleware, notificationController.markAsRead);
router.put('/notifications/read-all', authMiddleware, notificationController.markAllAsRead);
router.delete('/notifications/:notificationId', authMiddleware, notificationController.deleteNotification);

router.get('/templates/:teamId', authMiddleware, templateController.getTemplates);
router.get('/templates/:teamId/active/:type', authMiddleware, templateController.getActiveTemplate);
router.get('/templates/id/:templateId', authMiddleware, templateController.getTemplateById);
router.post('/templates', authMiddleware, requireTeamLead, templateController.createTemplate);
router.put('/templates/:templateId', authMiddleware, requireTeamLead, templateController.updateTemplate);
router.delete('/templates/:templateId', authMiddleware, requireTeamLead, templateController.deleteTemplate);

router.get('/projects/:teamId', authMiddleware, projectController.getProjects);
router.get('/projects/id/:projectId', authMiddleware, projectController.getProjectById);
router.post('/projects', authMiddleware, requireTeamLead, projectController.createProject);
router.put('/projects/:projectId', authMiddleware, requireTeamLead, projectController.updateProject);
router.delete('/projects/:projectId', authMiddleware, requireTeamLead, projectController.deleteProject);

router.get('/stats/:teamId/overview', authMiddleware, statsController.getTeamOverview);
router.get('/stats/:teamId/submission-rate', authMiddleware, statsController.getSubmissionRateRanking);
router.get('/stats/:teamId/word-trend', authMiddleware, statsController.getAverageWordCountTrend);
router.get('/stats/:teamId/work-hours', authMiddleware, statsController.getWorkHoursStats);
router.get('/stats/:teamId/unsubmitted', authMiddleware, statsController.getUnsubmittedList);

export default router;
