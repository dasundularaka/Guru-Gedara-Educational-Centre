import { firestoreService } from './firestoreService';
import { UserProfile, AuditLog } from '../types';

export interface AuditEventPayload {
  action: string;
  details: string;
  username?: string;
  category?: 'auth' | 'user' | 'course' | 'payment' | 'banner' | 'settings' | 'security' | 'attendance' | 'persona' | 'system';
  metadata?: Record<string, any>;
}

/**
 * Retrieve acting username from persistent storage or fallbacks
 */
function resolveActingUsername(explicitUsername?: string): string {
  if (explicitUsername && explicitUsername.trim()) {
    return explicitUsername.trim();
  }

  // Check if an admin is currently viewing as another persona
  try {
    const cachedRealAdmin = localStorage.getItem('local_real_admin_user');
    if (cachedRealAdmin) {
      const parsed = JSON.parse(cachedRealAdmin);
      if (parsed?.name) return `${parsed.name} (Admin)`;
      if (parsed?.username) return `${parsed.username} (Admin)`;
    }
  } catch {
    // Ignore JSON parse errors
  }

  // Check the active logged-in user
  try {
    const cachedUser = localStorage.getItem('guru_current_user');
    if (cachedUser) {
      const parsed: UserProfile = JSON.parse(cachedUser);
      if (parsed?.name) return parsed.name;
      if (parsed?.username) return parsed.username;
      if (parsed?.email) return parsed.email;
    }
  } catch {
    // Ignore JSON parse errors
  }

  return 'Administrator';
}

/**
 * Centralized audit logging utility.
 * Automatically captures and saves all system state changes
 * (timestamp + acting username + category + metadata) to dedicated Firestore collections.
 */
export const auditLogger = {
  /**
   * Log an audit event with automatic timestamp and username capture
   */
  async log(payload: AuditEventPayload): Promise<AuditLog> {
    const username = resolveActingUsername(payload.username);
    const timestamp = new Date().toISOString();

    const logEntry: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp,
      username,
      action: payload.action,
      details: payload.details,
    };

    // Save through firestoreService which handles Firestore write + local fallback + deduplication
    try {
      await firestoreService.addAuditLog(logEntry);
    } catch (err) {
      console.warn('[AuditLogger] Non-blocking write error:', err);
    }

    // Dispatch global event for live reactive updates across UI components
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('app_audit_event_logged', {
            detail: { ...logEntry, category: payload.category, metadata: payload.metadata },
          })
        );
      }
    } catch {
      // Ignore in SSR
    }

    return logEntry;
  },

  /**
   * Administrative Actions Logging Helpers
   */
  async logUserApproval(adminUser: string | undefined, targetUser: string, targetRole: string) {
    return this.log({
      username: adminUser,
      action: 'APPROVE_USER',
      details: `Approved enrollment for user "${targetUser}" as ${targetRole}. Account activated.`,
      category: 'user',
      metadata: { targetUser, targetRole },
    });
  },

  async logUserRejection(adminUser: string | undefined, targetUser: string, reason?: string) {
    return this.log({
      username: adminUser,
      action: 'REJECT_USER',
      details: `Declined registration for "${targetUser}". ${reason ? `Reason: ${reason}` : ''}`,
      category: 'user',
      metadata: { targetUser, reason },
    });
  },

  async logUserDeletion(adminUser: string | undefined, targetUser: string, role: string) {
    return this.log({
      username: adminUser,
      action: 'DELETE_USER',
      details: `Permanently purged user account "${targetUser}" (${role}) from system registry.`,
      category: 'user',
      metadata: { targetUser, role },
    });
  },

  async logRoleAssignment(adminUser: string | undefined, targetUser: string, oldRole: string, newRole: string) {
    return this.log({
      username: adminUser,
      action: 'ROLE_CHANGE',
      details: `Updated permissions for "${targetUser}" from [${oldRole}] to [${newRole}].`,
      category: 'security',
      metadata: { targetUser, oldRole, newRole },
    });
  },

  async logClassCreated(adminUser: string | undefined, className: string, tutorName?: string) {
    return this.log({
      username: adminUser,
      action: 'CREATE_CLASS',
      details: `Created new tuition curriculum: "${className}"${tutorName ? ` assigned to ${tutorName}` : ''}.`,
      category: 'course',
      metadata: { className, tutorName },
    });
  },

  async logClassUpdated(adminUser: string | undefined, className: string, updateSummary: string) {
    return this.log({
      username: adminUser,
      action: 'UPDATE_CLASS',
      details: `Modified curriculum parameters for "${className}": ${updateSummary}.`,
      category: 'course',
      metadata: { className },
    });
  },

  async logClassDeleted(adminUser: string | undefined, className: string) {
    return this.log({
      username: adminUser,
      action: 'DELETE_CLASS',
      details: `Purged tuition class "${className}" from active academic directory.`,
      category: 'course',
      metadata: { className },
    });
  },

  async logPaymentStatusChange(
    adminUser: string | undefined,
    studentName: string,
    actionDesc: string,
    amount?: string | number
  ) {
    return this.log({
      username: adminUser,
      action: 'PAYMENT_UPDATE',
      details: `${actionDesc} for student "${studentName}"${amount ? ` (LKR ${amount})` : ''}.`,
      category: 'payment',
      metadata: { studentName, amount },
    });
  },

  async logBannerChange(adminUser: string | undefined, bannerTitle: string, actionType: 'created' | 'updated' | 'deleted') {
    return this.log({
      username: adminUser,
      action: `BANNER_${actionType.toUpperCase()}`,
      details: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} promotional hero banner: "${bannerTitle}".`,
      category: 'banner',
      metadata: { bannerTitle, actionType },
    });
  },

  async logSystemSettingChange(adminUser: string | undefined, settingName: string, details: string) {
    return this.log({
      username: adminUser,
      action: 'SYSTEM_SETTINGS_UPDATE',
      details: `Updated platform configuration for "${settingName}": ${details}.`,
      category: 'settings',
      metadata: { settingName },
    });
  },

  async logViewAsSession(adminUser: string | undefined, rolePersona: string, mode: 'entered' | 'exited') {
    return this.log({
      username: adminUser,
      action: mode === 'entered' ? 'VIEW_AS_START' : 'VIEW_AS_END',
      details: mode === 'entered'
        ? `Initiated simulated 'View-As' session as [${rolePersona}] persona.`
        : `Exited 'View-As' simulation mode. Resumed administrative session.`,
      category: 'persona',
      metadata: { rolePersona, mode },
    });
  },

  async logAttendanceBatch(adminOrTutor: string | undefined, className: string, count: number) {
    return this.log({
      username: adminOrTutor,
      action: 'ATTENDANCE_RECORDED',
      details: `Verified attendance roll for ${count} students in "${className}".`,
      category: 'attendance',
      metadata: { className, count },
    });
  },
};
