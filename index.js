const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const { extractColors } = require("extract-colors");
const getPixels = require("get-pixels");
const pdfPoppler = require("pdf-poppler");

async function cekGambarBerwarna(imagePath) {
  return new Promise((resolve, reject) => {
    getPixels(imagePath, (err, pixels) => {
      if (err) {
        reject(err);
      } else {
        const data = [...pixels.data];
        const [width, height] = pixels.shape;

        extractColors({ data, width, height })
          .then((colors) => {
            resolve(colors.some((color) => color.saturation > 0.1));
          })
          .catch(reject);
      }
    });
  });
}

async function prosesHalaman(pdfPath, outputDir, pageIndex) {
  const sekarang = new Date();
  const tanggalFormat = sekarang.toISOString().replace(/[:.]/g, "-");
  const prefixOutput = `page-${tanggalFormat}-${pageIndex + 1}`;

  await pdfPoppler.convert(pdfPath, {
    format: "png",
    out_dir: outputDir,
    out_prefix: prefixOutput,
    page: pageIndex + 1,
  });

  const files = fs.readdirSync(outputDir);
  const fileGambarHalaman = files.find(
    (file) => file.startsWith(prefixOutput) && file.endsWith(".png")
  );
  if (!fileGambarHalaman) {
    throw new Error(
      `File gambar untuk halaman ${pageIndex + 1} tidak ditemukan`
    );
  }
  const pathGambarHalaman = path.join(outputDir, fileGambarHalaman);
  const berwarna = await cekGambarBerwarna(pathGambarHalaman);
  fs.unlinkSync(pathGambarHalaman);
  console.log(
    `Halaman ${pageIndex + 1} ${berwarna ? "berwarna" : "hitam putih"}`
  );

  return berwarna;
}

async function analisisPDF(pdfPath) {
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const jumlahHalaman = pdfDoc.getPageCount();

  const janjiHalaman = [];
  for (let i = 0; i < jumlahHalaman; i++) {
    janjiHalaman.push(prosesHalaman(pdfPath, outputDir, i));
  }

  const hasil = await Promise.all(janjiHalaman);
  const jumlahHalamanBerwarna = hasil.filter((berwarna) => berwarna).length;

  console.log(`Total halaman berwarna: ${jumlahHalamanBerwarna}`);
}

const pathPDF = "./Metopen.pdf";
analisisPDF(pathPDF).catch(console.error);
