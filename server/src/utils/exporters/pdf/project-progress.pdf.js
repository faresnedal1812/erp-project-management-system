import { buildPdf } from "./pdf.renderer.js";

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB");
};

const formatDateTime = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-GB");
};

const formatStatus = (value) => {
  if (!value) return "-";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const buildProjectProgressPdf = async (data) => {
  const project = data.project;
  const summary = data.summary;

  return buildPdf({
    title: "Project Progress Report",
    subtitle: project.name,

    sections: [
      {
        title: "Project Information",

        details: [
          {
            label: "Project",
            value: project.name,
          },
          {
            label: "Client",
            value: project.client ?? "-",
          },
          {
            label: "Status",
            value: formatStatus(project.status),
          },
          {
            label: "Start Date",
            value: formatDate(project.startDate),
          },
          {
            label: "End Date",
            value: formatDate(project.endDate),
          },
        ],
      },

      {
        title: "Progress Summary",

        summary: {
          "Total Tasks": summary.total,
          Completed: summary.completed,
          Pending: summary.pending,
          Overdue: summary.overdue,
          Cancelled: summary.cancelled,
          "Progress %": `${summary.progressPct}%`,
        },
      },

      {
        title: "Milestones",

        tables: [
          {
            columns: [
              {
                key: "name",
                label: "Milestone",
                width: 3,
              },
              {
                key: "isCompleted",
                label: "Status",
                width: 1.5,
                getValue: (row) => (row.isCompleted ? "Completed" : "Pending"),
              },
              {
                key: "dueDate",
                label: "Due Date",
                width: 1.5,
                getValue: (row) => formatDate(row.dueDate),
              },
            ],

            rows: data.milestones,
          },
        ],
      },

      {
        title: "Tasks",

        tables: [
          {
            columns: [
              {
                key: "title",
                label: "Task",
                width: 3,
              },
              {
                key: "status",
                label: "Status",
                width: 1.5,
                getValue: (row) => formatStatus(row.status),
              },
              {
                key: "priority",
                label: "Priority",
                width: 1.2,
                getValue: (row) => formatStatus(row.priority),
              },
              {
                key: "dueDate",
                label: "Due Date",
                width: 1.5,
                getValue: (row) => formatDate(row.dueDate),
              },
              {
                key: "completedAt",
                label: "Completed",
                width: 1.7,
                getValue: (row) => formatDateTime(row.completedAt),
              },
              {
                key: "assignees",
                label: "Assignees",
                width: 2,
                getValue: (row) => row.assignees?.join(", ") || "-",
              },
            ],

            rows: data.tasks,
          },
        ],
      },
    ],
  });
};

export default buildProjectProgressPdf;
