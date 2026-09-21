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

const formatFileSize = (bytes) => {
  const size = Number(bytes);

  if (!size || size < 0) {
    return "-";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const buildVendorAgreementsPdf = async (data) => {
  const vendor = data.vendor;
  const summary = data.summary;

  const buildDocumentColumns = () => [
    {
      key: "title",
      label: "Document",
      width: 2.8,
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
      width: 1.2,
      getValue: (row) => formatStatus(row.scope),
    },
    {
      key: "fileName",
      label: "File Name",
      width: 2.5,
    },
    {
      key: "uploadedBy",
      label: "Uploaded By",
      width: 2,
    },
    {
      key: "mimeType",
      label: "Type",
      width: 1.5,
    },
    {
      key: "sizeBytes",
      label: "Size",
      width: 1.2,
      getValue: (row) => formatFileSize(row.sizeBytes),
    },
    {
      key: "createdAt",
      label: "Created At",
      width: 1.8,
      getValue: (row) => formatDateTime(row.createdAt),
    },
  ];

  return buildPdf({
    title: "Vendor Agreements Report",
    subtitle: vendor.name,

    orientation: "landscape",

    sections: [
      {
        title: "Vendor Information",

        details: [
          {
            label: "Vendor",
            value: vendor.name,
          },
          {
            label: "Type",
            value: formatStatus(vendor.type),
          },
          {
            label: "Contact Name",
            value: vendor.contactName ?? "-",
          },
          {
            label: "Email",
            value: vendor.email ?? "-",
          },
          {
            label: "Phone",
            value: vendor.phone ?? "-",
          },
          {
            label: "Tax ID",
            value: vendor.taxId ?? "-",
          },
          {
            label: "Payment Terms",
            value: vendor.paymentTerms ?? "-",
          },
          {
            label: "Status",
            value: formatStatus(vendor.status),
          },
          {
            label: "Notes",
            value: vendor.notes ?? "-",
          },
        ],
      },

      {
        title: "Vendor Summary",

        summary: {
          "Total Agreements": summary.totalAgreements,
          "Total Documents": summary.totalDocuments,
          "Total Meetings": summary.totalMeetings,
        },
      },

      {
        title: "Agreements",

        tables: [
          {
            columns: buildDocumentColumns(),
            rows: data.agreements,
          },
        ],
      },

      {
        title: "Other Documents",

        tables: [
          {
            columns: buildDocumentColumns(),
            rows: data.otherDocuments,
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
                key: "status",
                label: "Status",
                width: 1.5,
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

export default buildVendorAgreementsPdf;
