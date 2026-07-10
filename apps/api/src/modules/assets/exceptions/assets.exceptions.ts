export class AssetException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AssetSyncException extends AssetException {
  constructor(message: string) {
    super(message);
  }
}

export class AssetFetchException extends AssetException {
  constructor(message: string) {
    super(message);
  }
}

export class ProfileSyncException extends AssetException {
  constructor(message: string) {
    super(message);
  }
}

export class PaginationException extends AssetException {
  constructor(message: string) {
    super(message);
  }
}
