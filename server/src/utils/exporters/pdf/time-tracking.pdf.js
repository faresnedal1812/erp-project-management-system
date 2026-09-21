import { buildPdf } from "./pdf.renderer.js";

const formatDateTime = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-GB");
};

const formatDuration = (minutes) => {
  const totalMinutes = Number(minutes) || 0;

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
};

const buildTimeTrackingPdf = async (data, { groupBy = "project" } = {}) => {
  const sections = data.map((group) => {
    const columns =
      groupBy === "employee"
        ? [
            {
              key: "project",
              label: "Project",
              width: 2,
            },
            {
              key: "task",
              label: "Task",
              width: 2.4,
            },
            {
              key: "description",
              label: "Description",
              width: 2.5,
            },
            {
              key: "startedAt",
              label: "Started",
              width: 1.8,
              getValue: (row) => formatDateTime(row.startedAt),
            },
            {
              key: "endedAt",
              label: "Ended",
              width: 1.8,
              getValue: (row) => formatDateTime(row.endedAt),
            },
            {
              key: "durationMin",
              label: "Duration",
              width: 1.2,
              getValue: (row) => formatDuration(row.durationMin),
            },
          ]
        : [
            {
              key: "employee",
              label: "Employee",
              width: 2,
            },
            {
              key: "task",
              label: "Task",
              width: 2.4,
            },
            {
              key: "description",
              label: "Description",
              width: 2.5,
            },
            {
              key: "startedAt",
              label: "Started",
              width: 1.8,
              getValue: (row) => formatDateTime(row.startedAt),
            },
            {
              key: "endedAt",
              label: "Ended",
              width: 1.8,
              getValue: (row) => formatDateTime(row.endedAt),
            },
            {
              key: "durationMin",
              label: "Duration",
              width: 1.2,
              getValue: (row) => formatDuration(row.durationMin),
            },
          ];

    return {
      title: group.label,

      summary: {
        Entries: group.entries.length,
        "Total Minutes": group.totalMinutes,
        "Total Hours": group.totalHours,
      },

      tables: [
        {
          title: "Time Entries",
          columns,
          rows: group.entries,
        },
      ],
    };
  });

  return buildPdf({
    title: "Time Tracking Report",
    subtitle: `Grouped by ${groupBy}`,
    sections,
    orientation: "landscape",
  });
};

export default buildTimeTrackingPdf;
