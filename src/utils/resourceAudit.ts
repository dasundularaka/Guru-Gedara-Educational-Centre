import { StudyMaterial, UserProfile, ClassItem, Booking } from '../types';
import { canUserViewStudyResource } from './accessControl';
import { firestoreService } from '../lib/firestoreService';

const STORAGE_KEY_PREFIX = 'guru_resource_view_';

/**
 * Record a study resource access event in local storage and dispatch to backend
 */
export async function recordMaterialAccess(
  materialId: string,
  user: UserProfile | null
): Promise<string> {
  const timestamp = new Date().toISOString();
  if (!materialId) return timestamp;

  try {
    const key = `${STORAGE_KEY_PREFIX}${user?.uid || 'guest'}_${materialId}`;
    localStorage.setItem(key, timestamp);

    // Also update a global map of views in localStorage
    const mapKey = `guru_views_map_${user?.uid || 'guest'}`;
    const currentMapRaw = localStorage.getItem(mapKey);
    const currentMap: Record<string, string> = currentMapRaw ? JSON.parse(currentMapRaw) : {};
    currentMap[materialId] = timestamp;
    localStorage.setItem(mapKey, JSON.stringify(currentMap));

    // If user is authenticated student, update profile log asynchronously
    if (user && user.role === 'student') {
      const existingIds = new Set(user.viewedMaterialIds || []);
      existingIds.add(materialId);
      
      const newLog = {
        ...(user.materialAccessLog || {}),
        [materialId]: timestamp
      };

      // Fire and forget update
      firestoreService.updateUserProfile(user.uid, {
        viewedMaterialIds: Array.from(existingIds),
        materialAccessLog: newLog
      }).catch(err => {
        console.warn("Could not sync material view to profile", err);
      });

      // Also record audit log event
      firestoreService.addAuditLog({
        userId: user.uid,
        userName: user.name,
        userRole: user.role,
        action: 'resource_access',
        resourceType: 'study_material',
        resourceId: materialId,
        details: `Viewed or downloaded resource ${materialId}`
      }).catch(() => {});
    }
  } catch (e) {
    console.warn("Error recording material access:", e);
  }

  return timestamp;
}

/**
 * Check if a resource has been viewed by the student, and get the last viewed timestamp
 */
export function getMaterialAccessInfo(
  materialId: string,
  user: UserProfile | null
): { hasViewed: boolean; lastViewedAt?: string } {
  if (!materialId) return { hasViewed: false };

  // 1. Check user profile state if available
  if (user?.materialAccessLog?.[materialId]) {
    return {
      hasViewed: true,
      lastViewedAt: user.materialAccessLog[materialId]
    };
  }

  if (user?.viewedMaterialIds?.includes(materialId)) {
    return {
      hasViewed: true
    };
  }

  // 2. Check localStorage
  try {
    const key = `${STORAGE_KEY_PREFIX}${user?.uid || 'guest'}_${materialId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return {
        hasViewed: true,
        lastViewedAt: stored
      };
    }

    const mapKey = `guru_views_map_${user?.uid || 'guest'}`;
    const mapRaw = localStorage.getItem(mapKey);
    if (mapRaw) {
      const map = JSON.parse(mapRaw);
      if (map[materialId]) {
        return {
          hasViewed: true,
          lastViewedAt: map[materialId]
        };
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  return { hasViewed: false };
}

/**
 * Calculate the count of new / unviewed study resources uploaded for the student's enrolled classes
 */
export function getUnviewedEnrolledMaterialsCount(
  materials: StudyMaterial[],
  user: UserProfile | null,
  classes: ClassItem[] = [],
  bookings: Booking[] = []
): { count: number; unviewedList: StudyMaterial[] } {
  if (!user || user.role !== 'student') {
    return { count: 0, unviewedList: [] };
  }

  // Get materials accessible to this student
  const authorized = materials.filter(m => canUserViewStudyResource(m, user, classes, bookings));

  const unviewedList = authorized.filter(mat => {
    const access = getMaterialAccessInfo(mat.id, user);
    return !access.hasViewed;
  });

  return {
    count: unviewedList.length,
    unviewedList
  };
}
