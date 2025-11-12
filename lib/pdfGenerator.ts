import { Report } from "../types";

export const generateReportPDF = async (report: Report) => {
  if (typeof window === "undefined") return;

  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

  const pdfMake = (pdfMakeModule as any).default || pdfMakeModule;
  const pdfFonts = (pdfFontsModule as any).default || pdfFontsModule;

  (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs;

  const agendaList = Array.from({ length: 12 }, (_, i) => report.agenda?.[i] || "");
  const participantList = Array.from({ length: 12 }, (_, i) => {
    const name = report.participants?.[i] || "";
    if (i === 0) return `Moderacja: ${name}`;
    if (i === 1) return `Sprawozdanie: ${name}`;
    return name;
  });

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const taskRows = Array.from({ length: 8 }, (_, i) => {
    const task = report.tasks?.[i];
    return [
      `${i + 1}.`,
      task?.zadanie || "",
      task?.data ? formatDate(task.data) : "",
      task?.osoba || "",
    ];
  });

  

  const formattedDate = report.date ? formatDate(report.date) : "";


  const docDefinition = {
    content: [
      {
        columns: [
          { text: report.topic, style: "header" },
          { text: formattedDate, style: "header", alignment: "right", margin: [0, 0, 0, 20] },
        ],
      },
      { 
        columns: [
          {
            stack: [
              { text: "Agenda:", style: "subheader" },
              { ol: agendaList, margin: [0, 0, 0, 20] },
            ],
          },
          {
            stack: [
              { text: "Osoby na spotkaniu:", style: "subheader" },
              { ol: participantList, margin: [0, 0, 0, 20] },
            ],
          },
        ],
      },

      { text: "Taski:", style: "subheader" },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto", "*"],
          body: [
            ["L.p.", "Zadanie", "Data", "Osoba"],
            ...taskRows,
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 20],
      },

      { text: "Notatki:", style: "subheader" },
      {
        text:
          report.notes ||
          "(brak notatek)",
        margin: [0, 0, 0, 10],
      },
    ],
    styles: {
      header: { fontSize: 24, bold: true },
      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
    },
    defaultStyle: { font: "Roboto" },
  };

  pdfMake.createPdf(docDefinition).download(`sprawozdanie-${report.topic || "spotkanie"}.pdf`);
};
