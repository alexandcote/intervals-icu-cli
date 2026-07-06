/** Pick dot-path fields from an object; missing paths are silently skipped. */
export function pickFields(obj: unknown, paths: string[]): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map((item) => pickFields(item, paths))

  const out: Record<string, unknown> = {}
  for (const path of paths) {
    const segments = path.split('.')
    copyPath(obj as Record<string, unknown>, out, segments)
  }
  return out
}

function copyPath(src: Record<string, unknown>, dest: Record<string, unknown>, segments: string[]): void {
  const [head, ...rest] = segments
  if (head === undefined || !(head in src)) return
  const value = src[head]
  if (rest.length === 0) {
    dest[head] = value
    return
  }
  if (Array.isArray(value)) {
    const existing = dest[head]
    const target = Array.isArray(existing) ? existing : value.map(() => ({}))
    value.forEach((item, i) => {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        copyPath(item as Record<string, unknown>, target[i] as Record<string, unknown>, rest)
      }
    })
    dest[head] = target
    return
  }
  if (value !== null && typeof value === 'object') {
    const existing = dest[head]
    const target =
      existing !== null && typeof existing === 'object' && !Array.isArray(existing)
        ? (existing as Record<string, unknown>)
        : {}
    copyPath(value as Record<string, unknown>, target, rest)
    dest[head] = target
  }
}

export function parseFieldList(value: string): string[] {
  return value
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f.length > 0)
}

/** Default field sets: keep list/detail payloads small; --full bypasses. */
export const DEFAULT_FIELDS = {
  activityList:
    'id,start_date_local,type,name,moving_time,distance,icu_training_load,icu_intensity,average_watts,icu_weighted_avg_watts,average_heartrate,pace,total_elevation_gain',
  activityDetail: [
    'id',
    'start_date_local',
    'type',
    'name',
    'description',
    'moving_time',
    'elapsed_time',
    'distance',
    'total_elevation_gain',
    'icu_training_load',
    'icu_intensity',
    'icu_ftp',
    'icu_joules',
    'trimp',
    'average_watts',
    'icu_weighted_avg_watts',
    'icu_average_watts',
    'max_watts',
    'average_heartrate',
    'max_heartrate',
    'average_cadence',
    'average_speed',
    'max_speed',
    'pace',
    'gap',
    'calories',
    'icu_atl',
    'icu_ctl',
    'feel',
    'perceived_exertion',
    'session_rpe',
    'icu_efficiency_factor',
    'icu_power_hr',
    'decoupling',
    'icu_zone_times',
    'icu_hr_zone_times',
    'pace_zone_times',
    'gear',
    'tags',
    'intervals',
  ],
  athlete: [
    'id',
    'name',
    'profile_medium',
    'city',
    'state',
    'country',
    'timezone',
    'sex',
    'bio',
    'website',
    'email',
    'sportSettings',
    'icu_date_dashboard_shown',
    'icu_resting_hr',
    'icu_weight',
    'weight',
  ],
  folderList: ['id', 'name', 'type', 'description', 'num_workouts', 'shared_folder_id'],
} as const
