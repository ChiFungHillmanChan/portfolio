import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import { config } from './config.js';

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export async function processInput(bot, msg) {
  const jobId = Date.now().toString(36);
  const tempDir = path.join(config.tempBase, jobId);
  await fs.mkdir(tempDir, { recursive: true });

  const parts = [];
  const filePaths = [];

  // Text
  if (msg.text && !msg.text.startsWith('/')) {
    parts.push(msg.text);
  }

  // Caption (for photos/documents with text)
  if (msg.caption) {
    parts.push(msg.caption);
  }

  // Voice
  if (msg.voice || msg.audio) {
    const fileId = (msg.voice || msg.audio).file_id;
    const text = await transcribeVoice(bot, fileId, tempDir);
    parts.push(text);
  }

  // Photo (take highest resolution)
  if (msg.photo) {
    const photo = msg.photo[msg.photo.length - 1];
    const filePath = await downloadFile(bot, photo.file_id, tempDir, 'photo.jpg');
    filePaths.push(filePath);
  }

  // Document
  if (msg.document) {
    const doc = msg.document;
    const filePath = await downloadFile(bot, doc.file_id, tempDir, doc.file_name || 'document');
    const textExts = ['.md', '.json', '.txt', '.csv', '.jsx', '.js', '.ts', '.py'];
    if (textExts.some(ext => filePath.endsWith(ext))) {
      const content = await fs.readFile(filePath, 'utf-8');
      parts.push(`\n--- File: ${doc.file_name} ---\n${content}\n---`);
    } else {
      filePaths.push(filePath);
    }
  }

  return { text: parts.join('\n'), filePaths, tempDir };
}

async function transcribeVoice(bot, fileId, tempDir) {
  const file = await bot.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`;
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());

  const audioPath = path.join(tempDir, 'voice.oga');
  await fs.writeFile(audioPath, buffer);

  const { createReadStream } = await import('fs');
  const transcription = await openai.audio.transcriptions.create({
    file: createReadStream(audioPath),
    model: 'whisper-1',
  });

  return transcription.text;
}

async function downloadFile(bot, fileId, tempDir, filename) {
  const file = await bot.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`;
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());

  const filePath = path.join(tempDir, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function cleanupTempDir(tempDir) {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}
