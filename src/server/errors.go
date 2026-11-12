package main

import (
	"errors"
	"log"
)

type ApiErrorCode int

const (
	NotFoundError ApiErrorCode = iota
	BadRequestError
	UnexpectedError
)

var apiErrorValues = map[ApiErrorCode]error{
	NotFoundError:   errors.New("not found"),
	BadRequestError: errors.New("bad request"),
	UnexpectedError: errors.New("unexpected error, contact support"),
}

var apiErrorI18n = map[ApiErrorCode]string{
	NotFoundError:   "#api_error_not_found",
	BadRequestError: "#api_error_bad_request",
	UnexpectedError: "#api_error_unexpected_error",
}

type apiError interface {
	Error() string
	I18n() string
	isApiError() bool
}

type apiError2 struct {
	StatusCode int
	Err        error
	i18n       string
}

func (e apiError2) Error() string {
	return e.Err.Error()
}

func (e apiError2) I18n() string {
	return e.i18n
}

func (e apiError2) isApiError() bool {
	return true
}

func CreateApiError(c ApiErrorCode) apiError2 {
	e, found := apiErrorValues[c]
	if !found {
		log.Println("Missing message for error code ", c)
		e = apiErrorValues[UnexpectedError]
	}

	i, found := apiErrorI18n[c]
	if !found {
		log.Println("Missing i18n for error code ", c)
		e = apiErrorValues[UnexpectedError]
	}

	return apiError2{Err: e, i18n: i}
}
