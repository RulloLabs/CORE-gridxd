#!/usr/bin/env node
import { Command } from "commander";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import chalk from "chalk";

const API_URL = process.env.GRIDXD_API_URL || "https://gridxd-main-production.up.railway.app/api/process";

const program = new Command();

program
  .name("gridxd")
  .description("CLI para detectar y extraer iconos automáticamente mediante GridXD")
  .version("1.0.0");

program
  .command("extract")
  .description("Extrae iconos de una lámina o spritesheet")
  .argument("<file>", "Ruta a la imagen (PNG/JPG)")
  .option("-o, --output <dir>", "Directorio de salida para el ZIP", ".")
  .option("--no-upscale", "Desactiva el escalado automático a 2K")
  .option("--no-bg-removal", "Desactiva la eliminación de fondo transparente")
  .action(async (file, options) => {
    const filePath = path.resolve(process.cwd(), file);

    if (!fs.existsSync(filePath)) {
      console.error(chalk.red(`❌ Archivo no encontrado: ${filePath}`));
      process.exit(1);
    }

    try {
      console.log(chalk.cyan("🚀 Iniciando extracción con GridXD..."));

      const form = new FormData();
      form.append("file", fs.createReadStream(filePath));
      form.append("options", JSON.stringify({
        upscale: options.upscale,
        removeBackground: options.bgRemoval
      }));

      console.log(chalk.gray(`Subiendo ${path.basename(filePath)} al motor de IA...`));

      const response = await axios.post(API_URL, form, {
        headers: { ...form.getHeaders() },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      if (response.data?.images?.length > 0) {
        console.log(chalk.green(`✅ Procesamiento completado. ${response.data.images.length} iconos extraídos.`));

        // En una app real de CLI, descargaríamos el .zip aquí.
        // Para este prototipo, mostramos que devolvió resultados en base64 simulados.
        console.log(chalk.yellow("⚡ Para obtener los archivos finales en ZIP, ejecuta con '--download-zip'. (Prototipo)"));
      } else {
        console.log(chalk.yellow("⚠️ No se detectaron iconos en la imagen."));
      }

    } catch (error: unknown) {
      console.error(chalk.red("❌ Error en el procesamiento:"));
      if (error instanceof Error) {
        console.error(error.message);
      }
      if (axios.isAxiosError(error) && error.response?.data) {
        console.error(chalk.red(JSON.stringify(error.response.data, null, 2)));
      }
      process.exit(1);
    }
  });

program.parse();
