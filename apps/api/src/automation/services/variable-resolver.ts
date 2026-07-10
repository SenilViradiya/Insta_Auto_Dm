import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext } from '../interfaces/execution-context.interface';
import { VariableResolutionException } from '../errors/automation.errors';

@Injectable()
export class VariableResolver {
  private readonly logger = new Logger(VariableResolver.name);

  resolve(template: string, context: ExecutionContext): string {
    if (!template) return '';

    return template.replace(/\{\{([^{}]+)\}\}/g, (match, pathExpression) => {
      const variableName = pathExpression.trim();
      try {
        return this.resolveExpression(variableName, context);
      } catch (error) {
        this.logger.error(`Error resolving variable "${variableName}":`, error);
        throw new VariableResolutionException(
          `Failed to resolve variable "{{${variableName}}}": ${(error as Error).message}`,
        );
      }
    });
  }

  private resolveExpression(variableName: string, context: ExecutionContext): string {
    switch (variableName) {
      case 'user.username':
        return context.sender?.username || context.sender?.id || 'User';
      case 'comment.text':
        return context.triggerPayload?.content?.text || '';
      case 'reel.caption':
        return context.triggerPayload?.content?.caption || '';
      case 'current_time':
        return new Date().toISOString();
      default:
        // Attempt nested path lookup inside context (or context.triggerPayload)
        const resolved = this.getValueByPath(context, variableName);
        if (resolved !== undefined) return resolved;

        throw new VariableResolutionException(`Unknown variable expression: "${variableName}"`);
    }
  }

  private getValueByPath(obj: any, path: string): string | undefined {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[part];
    }
    if (current === null || current === undefined) {
      return '';
    }
    return typeof current === 'object' ? JSON.stringify(current) : String(current);
  }
}
