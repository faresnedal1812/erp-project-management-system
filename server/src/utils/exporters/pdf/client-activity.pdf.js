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

const buildClientActivityPdf = async (data) => {
  const client = data.client;
  const summary = data.summary;

  return buildPdf({
    title: "Client Activity Report",
    subtitle: client.name,

    orientation: "landscape",

    sections: [
      {
        title: "Client Information",

        details: [
          {
            label: "Client",
            value: client.name,
          },
          {
            label: "Contact Name",
            value: client.contactName ?? "-",
          },
          {
            label: "Email",
            value: client.email ?? "-",
          },
          {
            label: "Phone",
            value: client.phone ?? "-",
          },
          {
            label: "Status",
            value: formatStatus(client.status),
          },
        ],
      },

      {
        title: "Activity Summary",

        summary: {
          "Total Projects": summary.totalProjects,
          "Total Documents": summary.totalDocuments,
          "Total Meetings": summary.totalMeetings,
        },
      },

      {
        title: "Projects",

        tables: [
          {
            columns: [
              {
                key: "name",
                label: "Project",
                width: 3,
              },
              {
                key: "status",
                label: "Status",
                width: 1.5,
                getValue: (row) => formatStatus(row.status),
              },
              {
                key: "startDate",
                label: "Start Date",
                width: 1.5,
                getValue: (row) => formatDate(row.startDate),
              },
              {
                key: "endDate",
                label: "End Date",
                width: 1.5,
                getValue: (row) => formatDate(row.endDate),
              },
              {
                key: "_count",
                label: "Tasks",
                width: 1,
                getValue: (row) => row._count?.tasks ?? 0,
              },
            ],

            rows: data.projects,
          },
        ],
      },

      {
        title: "Documents",

        tables: [
          {
            columns: [
              {
                key: "title",
                label: "Document",
                width: 3,
              },
              {
                key: "category",
                label: "Category",
                width: 1.5,
                getValue: (row) => formatStatus(row.category),
              },
              {
                key: "scope",
                label: "Scope",
                width: 1.3,
                getValue: (row) => formatStatus(row.scope),
              },
              {
                key: "fileName",
                label: "File Name",
                width: 3,
              },
              {
                key: "createdAt",
                label: "Created At",
                width: 1.8,
                getValue: (row) => formatDateTime(row.createdAt),
              },
            ],

            rows: data.documents,
          },
        ],
      },

      {
        title: "Meetings",

        tables: [
          {
            columns: [
              {
                key: "title",
                label: "Meeting",
                width: 3,
              },
              {
                key: "type",
                label: "Type",
                width: 1.4,
                getValue: (row) => formatStatus(row.type),
              },
              {
                key: "status",
                label: "Status",
                width: 1.4,
                getValue: (row) => formatStatus(row.status),
              },
              {
                key: "startTime",
                label: "Start",
                width: 2,
                getValue: (row) => formatDateTime(row.startTime),
              },
              {
                key: "endTime",
                label: "End",
                width: 2,
                getValue: (row) => formatDateTime(row.endTime),
              },
            ],

            rows: data.meetings,
          },
        ],
      },
    ],
  });
};

export default buildClientActivityPdf;
