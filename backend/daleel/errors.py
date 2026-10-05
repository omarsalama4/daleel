class Problem(Exception):
    def __init__(self, status, code, detail, retryable=False):
        self.status, self.code, self.detail, self.retryable = status, code, detail, retryable
        super().__init__(detail)
