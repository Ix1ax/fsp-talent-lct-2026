// Пакет request разбирает JSON и общие параметры HTTP-запросов.
package request

import (
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }

func JSON(c *gin.Context, target any) error {
	media, _, err := mime.ParseMediaType(c.GetHeader("Content-Type"))
	if err != nil || media != "application/json" {
		return &ValidationError{Message: "Ожидается Content-Type: application/json"}
	}
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			return err
		}
		return &ValidationError{Message: "Некорректный JSON или неизвестное поле"}
	}
	var extra any
	if decoder.Decode(&extra) != io.EOF {
		return &ValidationError{Message: "Ожидается один JSON-объект"}
	}
	return nil
}
func Page(c *gin.Context) (int, int, error) {
	limit, offset := 20, 0
	for key, target := range map[string]*int{"limit": &limit, "offset": &offset} {
		if value, ok := c.GetQuery(key); ok {
			n, err := strconv.Atoi(value)
			if err != nil {
				return 0, 0, &ValidationError{Message: "limit и offset должны быть целыми числами"}
			}
			*target = n
		}
	}
	if limit < 1 || limit > 100 || offset < 0 || offset > 10000 {
		return 0, 0, &ValidationError{Message: "limit: от 1 до 100; offset: от 0 до 10000"}
	}
	return limit, offset, nil
}
