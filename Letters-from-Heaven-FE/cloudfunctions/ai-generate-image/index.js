'use strict';

const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');
const path = require('node:path');
const https = require('node:https');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const DEFAULT_PROVIDER_MODEL = process.env.IMAGE_PROVIDER_MODEL || 'hunyuan-image-latest';
const PROVIDER_ENDPOINT = process.env.IMAGE_PROVIDER_ENDPOINT || '';
const PROVIDER_API_KEY = process.env.IMAGE_PROVIDER_API_KEY || '';

function assertPrompt(prompt) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('prompt 不能为空。');
  }
}

function requestJson(url, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const target = new URL(url);

    const req = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          if (!raw) {
            reject(new Error(`生图服务返回为空，status=${res.statusCode}`));
            return;
          }

          if ((res.statusCode || 500) >= 400) {
            reject(new Error(`生图服务调用失败，status=${res.statusCode} body=${raw}`));
            return;
          }

          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(new Error(`生图服务返回非 JSON: ${raw}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if ((res.statusCode || 500) >= 400) {
          reject(new Error(`下载图片失败，status=${res.statusCode}`));
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
        res.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      })
      .on('error', reject);
  });
}

function normalizeProviderImageUrls(payload) {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  if (Array.isArray(payload.images)) {
    return payload.images
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item === 'object' && typeof item.url === 'string') {
          return item.url;
        }
        return '';
      })
      .filter(Boolean);
  }

  if (Array.isArray(payload.data)) {
    return payload.data
      .map((item) => {
        if (item && typeof item === 'object' && typeof item.url === 'string') {
          return item.url;
        }
        return '';
      })
      .filter(Boolean);
  }

  return [];
}

async function generateImageByProvider({ prompt, model, size, count, style }) {
  if (!PROVIDER_ENDPOINT || !PROVIDER_API_KEY) {
    throw new Error(
      '缺少 IMAGE_PROVIDER_ENDPOINT 或 IMAGE_PROVIDER_API_KEY。请在云函数环境变量中配置生图服务。'
    );
  }

  const payload = {
    model: model || DEFAULT_PROVIDER_MODEL,
    prompt,
    size: size || '1024x1024',
    n: count || 1,
    style,
  };

  const providerResult = await requestJson(PROVIDER_ENDPOINT, payload, {
    authorization: `Bearer ${PROVIDER_API_KEY}`,
  });

  const urls = normalizeProviderImageUrls(providerResult);
  if (!urls.length) {
    throw new Error('生图服务响应成功，但未识别到可下载图片 URL。');
  }

  return {
    provider: 'custom-http-provider',
    urls,
    raw: providerResult,
  };
}

async function uploadToCloudStorage(urls, requestId) {
  const uploaded = [];

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    const fileContent = await downloadBuffer(url);
    const ext = path.extname(new URL(url).pathname) || '.png';
    const cloudPath = `generated-images/${requestId}-${index}${ext}`;
    const uploadResult = await cloud.uploadFile({
      cloudPath,
      fileContent,
    });

    uploaded.push({
      fileID: uploadResult.fileID,
      originURL: url,
    });
  }

  const tempResult = await cloud.getTempFileURL({
    fileList: uploaded.map((item) => item.fileID),
  });

  const tempMap = new Map();
  const fileList = Array.isArray(tempResult.fileList) ? tempResult.fileList : [];
  fileList.forEach((item) => {
    if (item && item.fileID && item.tempFileURL) {
      tempMap.set(item.fileID, item.tempFileURL);
    }
  });

  return uploaded.map((item) => ({
    ...item,
    tempFileURL: tempMap.get(item.fileID) || '',
  }));
}

exports.main = async (event) => {
  try {
    const prompt = typeof event.prompt === 'string' ? event.prompt.trim() : '';
    assertPrompt(prompt);

    const requestId = crypto.randomUUID();
    const providerResult = await generateImageByProvider({
      prompt,
      model: event.model,
      size: event.size,
      count: event.count,
      style: event.style,
    });

    const images = await uploadToCloudStorage(providerResult.urls, requestId);

    return {
      success: true,
      requestId,
      provider: providerResult.provider,
      images,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '生图云函数执行失败。',
    };
  }
};
