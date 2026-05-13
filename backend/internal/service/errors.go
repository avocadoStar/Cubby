package service

import (
	"database/sql"
	"errors"
)

// AppError is a typed error returned by the service layer.
// Handlers use handleServiceError to map it to the correct HTTP status.
type AppError struct {
	Code    string // machine-readable: "conflict", "not_found", "invalid_input"
	Message string // safe, user-facing message
	Err     error  // internal error for logging only
}

func (e *AppError) Error() string { return e.Message }
func (e *AppError) Unwrap() error { return e.Err }
func (e *AppError) Is(target error) bool {
	t, ok := target.(*AppError)
	if !ok {
		return false
	}
	return e.Code == t.Code && e.Message == t.Message
}

func NewConflictError(msg string, err error) *AppError {
	return &AppError{Code: "conflict", Message: msg, Err: err}
}

func NewNotFoundError(err error) *AppError {
	return &AppError{Code: "not_found", Message: "not found", Err: err}
}

func NewValidationError(msg string) *AppError {
	return &AppError{Code: "invalid_input", Message: msg, Err: nil}
}

// IsNotFound reports whether err wraps sql.ErrNoRows or an AppError with code "not_found".
func IsNotFound(err error) bool {
	if errors.Is(err, sql.ErrNoRows) {
		return true
	}
	var appErr *AppError
	return errors.As(err, &appErr) && appErr.Code == "not_found"
}
