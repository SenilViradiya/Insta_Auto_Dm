import { Injectable, Logger } from '@nestjs/common';
import { MetaPlatformConfig } from '../config/meta-platform.config';
import { translateMetaError } from '../exceptions/meta-error.translator';
import {
  RequestTimeoutException,
  GraphClientException,
  MetaPlatformException,
} from '../exceptions/meta.exceptions';

@Injectable()
export class GraphClient {
  private readonly logger = new Logger(GraphClient.name);

  constructor(private readonly config: MetaPlatformConfig) {}

  async request<T = any>(options: {
    method: 'GET' | 'POST' | 'DELETE';
    endpoint: string;
    body?: any;
    headers?: Record<string, string>;
    token?: string;
    params?: Record<string, string>;
  }): Promise<T> {
    const { method, endpoint, body, headers, token, params } = options;
    const url = new URL(
      endpoint.startsWith('http')
        ? endpoint
        : `${this.config.graphApiBaseUrl}/${this.config.graphApiVersion}/${endpoint.replace(/^\//, '')}`
    );

    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        url.searchParams.append(key, val);
      });
    }

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    let attempt = 0;
    const maxAttempts = this.config.maxRetries + 1;

    while (attempt < maxAttempts) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.httpTimeoutMs);

      try {
        this.logger.debug(
          `[GraphClient] API Request: [${method}] ${url.pathname}${url.search} (Attempt ${attempt}/${maxAttempts})`
        );

        const response = await fetch(url.toString(), {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        let responseBody: any;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          responseBody = await response.json();
        } else {
          responseBody = { rawText: await response.text() };
        }

        if (!response.ok) {
          const metaError = responseBody?.error;
          if (metaError) {
            const translated = translateMetaError(metaError);
            this.logger.error(
              `[GraphClient] Meta returned error ${metaError.code} (subcode: ${metaError.error_subcode}): ${metaError.message}`
            );
            throw translated;
          } else {
            throw new GraphClientException(
              responseBody?.rawText || `HTTP response returned non-ok status: ${response.status}`,
              response.status
            );
          }
        }

        return responseBody as T;
      } catch (error) {
        clearTimeout(timeoutId);

        // If it's already a translated Meta Platform exception, don't retry permanent ones or translate again
        if (error instanceof MetaPlatformException) {
          throw error;
        }

        const isTimeout = (error as Error).name === 'AbortError';
        const isTransientNetwork =
          !isTimeout &&
          ((error as Error).message?.includes('fetch') ||
            (error as Error).message?.includes('network') ||
            (error as Error).message?.includes('socket') ||
            (error as Error).message?.includes('ECONNRESET'));

        const shouldRetry = (isTimeout || isTransientNetwork) && attempt < maxAttempts;

        if (shouldRetry) {
          this.logger.warn(
            `[GraphClient] Transient error (timeout: ${isTimeout}, network: ${isTransientNetwork}) on attempt ${attempt}. Retrying...`
          );
          // Simple delay before retrying
          await new Promise((res) => setTimeout(res, 500 * attempt));
          continue;
        }

        if (isTimeout) {
          throw new RequestTimeoutException(
            `Meta Graph request timed out after ${this.config.httpTimeoutMs}ms`
          );
        }

        throw new GraphClientException(`Network dispatch failed: ${(error as Error).message}`);
      }
    }

    throw new GraphClientException('Failed all request execution connection strategies');
  }

  async paginate<T = any>(
    endpoint: string,
    token: string,
    params?: Record<string, string>
  ): Promise<{ data: T[]; nextCursor?: string }> {
    const rawParams = {
      limit: '25',
      ...params,
    };

    const response = await this.request<any>({
      method: 'GET',
      endpoint,
      token,
      params: rawParams,
    });

    const data: T[] = response?.data || [];
    let nextCursor: string | undefined;

    const nextUrl = response?.paging?.next;
    if (nextUrl) {
      try {
        const parsedUrl = new URL(nextUrl);
        // Extract parameters or pass full URL as endpoint next time
        nextCursor = parsedUrl.searchParams.get('after') || undefined;
      } catch {
        // Fallback
      }
    }

    return { data, nextCursor };
  }
}
