import { IConversation, IPrompt } from 'src/types';
import { removeToken } from 'src/utils/token';

export * from './hooks/auth';
export * from './hooks/api';

export interface IConversationsFilters {
  authorEmail?: string;
  search?: string;
  feedback?: number;
}

export interface IPageInfo {
  hasNextPage: boolean;
  endCursor?: string;
}

export interface IPagination {
  first: number;
  cursor?: string | number;
}

export class ClientError extends Error {
  detail?: string;

  constructor(message: string, detail?: string) {
    super(message);
    this.detail = detail;
  }

  toString() {
    if (this.detail) {
      return `${this.message}: ${this.detail}`;
    } else {
      return this.message;
    }
  }
}

type Payload = FormData | any;

export class APIBase {
  constructor(
    public httpEndpoint: string,
    public on401?: () => void,
    public onError?: (error: ClientError) => void
  ) {}

  buildEndpoint(path: string) {
    if (this.httpEndpoint.endsWith('/')) {
      // remove trailing slash on httpEndpoint
      return `${this.httpEndpoint.slice(0, -1)}${path}`;
    } else {
      return `${this.httpEndpoint}${path}`;
    }
  }

  checkToken(token: string) {
    const prefix = 'Bearer ';
    if (token.startsWith(prefix)) {
      return token;
    } else {
      return prefix + token;
    }
  }

  async fetch(
    method: string,
    path: string,
    token?: string,
    data?: Payload,
    signal?: AbortSignal
  ): Promise<Response> {
    try {
      const headers: { Authorization?: string; 'Content-Type'?: string } = {};
      if (token) headers['Authorization'] = this.checkToken(token); // Assuming token is a bearer token

      let body;

      if (data instanceof FormData) {
        body = data;
      } else {
        headers['Content-Type'] = 'application/json';
        body = data ? JSON.stringify(data) : null;
      }

      const res = await fetch(this.buildEndpoint(path), {
        method,
        headers,
        signal,
        body
      });

      if (!res.ok) {
        const body = await res.json();
        if (res.status === 401 && this.on401) {
          removeToken();
          this.on401();
        }
        throw new ClientError(res.statusText, body.detail);
      }

      return res;
    } catch (error: any) {
      if (error instanceof ClientError && this.onError) {
        this.onError(error);
      }
      console.error(error);
      throw error;
    }
  }

  async get(endpoint: string, token?: string) {
    return await this.fetch('GET', endpoint, token);
  }

  async post(
    endpoint: string,
    data: Payload,
    token?: string,
    signal?: AbortSignal
  ) {
    return await this.fetch('POST', endpoint, token, data, signal);
  }

  async put(endpoint: string, data: Payload, token?: string) {
    return await this.fetch('PUT', endpoint, token, data);
  }

  async patch(endpoint: string, data: Payload, token?: string) {
    return await this.fetch('PATCH', endpoint, token, data);
  }

  async delete(endpoint: string, data: Payload, token?: string) {
    return await this.fetch('DELETE', endpoint, token, data);
  }
}

export class ChainlitAPI extends APIBase {
  async headerAuth() {
    const res = await this.post(`/auth/header`, {});
    return res.json();
  }

  async passwordAuth(data: FormData) {
    const res = await this.post(`/login`, data);
    return res.json();
  }

  async getCompletion(
    prompt: IPrompt,
    userEnv = {},
    controller: AbortController,
    accessToken?: string,
    tokenCb?: (done: boolean, token: string) => void
  ) {
    const response = await this.post(
      `/completion`,
      { prompt, userEnv },
      accessToken,
      controller.signal
    );

    const reader = response?.body?.getReader();

    const stream = new ReadableStream({
      start(controller) {
        function push() {
          reader!
            .read()
            .then(({ done, value }) => {
              if (done) {
                controller.close();
                tokenCb && tokenCb(done, '');
                return;
              }
              const string = new TextDecoder('utf-8').decode(value);
              tokenCb && tokenCb(done, string);
              controller.enqueue(value);
              push();
            })
            .catch((err) => {
              controller.close();
              tokenCb && tokenCb(true, '');
              console.error(err);
            });
        }
        push();
      }
    });

    return stream;
  }

  async setHumanFeedback(
    messageId: string,
    feedback: number,
    feedbackComment?: string,
    accessToken?: string
  ) {
    await this.put(
      `/message/feedback`,
      { messageId, feedback, feedbackComment },
      accessToken
    );
  }

  async getConversations(
    pagination: IPagination,
    filter: IConversationsFilters,
    accessToken?: string
  ): Promise<{
    pageInfo: IPageInfo;
    data: IConversation[];
  }> {
    const res = await this.post(
      `/project/conversations`,
      { pagination, filter },
      accessToken
    );

    return res.json();
  }

  async deleteConversation(conversationId: string, accessToken?: string) {
    const res = await this.delete(
      `/project/conversation`,
      { conversationId },
      accessToken
    );

    return res.json();
  }

  getLogoEndpoint(theme: string) {
    return this.buildEndpoint(`/logo?theme=${theme}`);
  }

  getOAuthEndpoint(provider: string) {
    return this.buildEndpoint(`/auth/oauth/${provider}`);
  }
}
