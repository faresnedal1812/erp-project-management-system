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

const buildEmployeeWorkloadPdf = async (data) => {
  const sections = data.map((employee) => ({
    title: employee.name,

    details: [
      {
        label: "Email",
        value: employee.email,
      },
      {
        label: "Position",
        value: employee.position ?? "-",
      },
      {
        label: "Status",
        value: formatStatus(employee.status),
      },
    ],

    summary: {
      "Tasks Assigned": employee.totalTasksAssigned,
      Completed: employee.totalTasksCompleted,
      "Open Tasks": employee.totalOpenTasks,
      Overdue: employee.totalOverdueTasks,
      "Logged Hours": employee.loggedHours,
    },

    tables: [
      {
        title: "Assigned Tasks",

        columns: [
          {
            key: "project",
            label: "Project",
            width: 2,
          },
          {
            key: "title",
            label: "Task",
            width: 3,
          },
          {
            key: "status",
            label: "Status",
            width: 1.4,
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
        ],

        rows: employee.tasks,
      },
    ],
  }));

  return buildPdf({
    title: "Employee Workload Report",
    subtitle: `Employees: ${data.length}`,
    sections,
    orientation: "landscape",
  });
};

export default buildEmployeeWorkloadPdf;
