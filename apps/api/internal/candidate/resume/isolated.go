package resume

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"os/exec"
	"runtime"
	"runtime/debug"
	"strconv"
	"time"
)

// Разбор PDF идёт в отдельном процессе (тот же бинарник в служебном режиме): библиотека чтения PDF может зациклиться или
// съесть гигабайты памяти на небольшом специально собранном файле, а убить горутину нельзя, процесс можно. Родитель
// убивает дочерний процесс по таймауту и ждёт его завершения, так что слот разбора освобождается только после его гибели.
const (
	childEnv        = "RESUME_PARSE_CHILD"
	maxChildInput   = 6 << 20
	maxChildOutput  = 4 << 20
	childHeapLimit  = 256 << 20
	childCPUSeconds = 20
)

// ErrParseTimeout — разбор не уложился во время и был прерван.
var ErrParseTimeout = errors.New("разбор резюме занял слишком много времени")

// IsChild сообщает, что процесс запущен как дочерний разборщик; main должен вызвать RunChild и выйти.
func IsChild() bool { return os.Getenv(childEnv) == "1" }

type childResult struct {
	Draft    Draft    `json:"draft"`
	Warnings []string `json:"warnings"`
	Kind     string   `json:"kind,omitempty"`
	Message  string   `json:"message,omitempty"`
}

func kindOf(err error) (string, string) {
	var broken *BrokenError
	switch {
	case err == nil:
		return "", ""
	case errors.Is(err, ErrNotPDF):
		return "not_pdf", ""
	case errors.Is(err, ErrNoText):
		return "no_text", ""
	case errors.Is(err, ErrTooManyPages):
		return "too_many_pages", ""
	case errors.Is(err, ErrUnrecognized):
		return "unrecognized", ""
	case errors.As(err, &broken):
		return "broken", broken.Err.Error()
	}
	return "broken", err.Error()
}

func errOf(kind, message string) error {
	switch kind {
	case "":
		return nil
	case "not_pdf":
		return ErrNotPDF
	case "no_text":
		return ErrNoText
	case "too_many_pages":
		return ErrTooManyPages
	case "unrecognized":
		return ErrUnrecognized
	}
	return &BrokenError{Err: errors.New(message)}
}

// RunChild читает PDF из stdin, разбирает и печатает результат JSON в stdout. Завершает процесс сам.
// Лимит процессорного времени и сторож памяти не дают разбору повлиять на сервер, даже если родитель не успеет убить процесс.
func RunChild() {
	limitCPU(childCPUSeconds)
	debug.SetMemoryLimit(childHeapLimit)
	go func() {
		var ms runtime.MemStats
		for {
			time.Sleep(20 * time.Millisecond)
			runtime.ReadMemStats(&ms)
			if ms.HeapAlloc > childHeapLimit {
				os.Exit(3)
			}
		}
	}()
	maxPages, _ := strconv.Atoi(os.Getenv("RESUME_MAX_PAGES"))
	unix, _ := strconv.ParseInt(os.Getenv("RESUME_NOW"), 10, 64)
	data, err := io.ReadAll(io.LimitReader(os.Stdin, maxChildInput))
	var out childResult
	if err == nil {
		var lines []Line
		if lines, err = ExtractLines(bytes.NewReader(data), int64(len(data)), maxPages); err == nil {
			out.Draft, out.Warnings, err = ParseHH(lines, time.Unix(unix, 0).UTC())
		}
	}
	out.Kind, out.Message = kindOf(err)
	if encodeErr := json.NewEncoder(os.Stdout).Encode(out); encodeErr != nil {
		os.Exit(4)
	}
	os.Exit(0)
}

type cappedBuffer struct {
	buf bytes.Buffer
	max int
}

func (c *cappedBuffer) Write(p []byte) (int, error) {
	if c.buf.Len()+len(p) > c.max {
		return 0, errors.New("вывод дочернего процесса слишком большой")
	}
	return c.buf.Write(p)
}

// ParseIsolated разбирает PDF в дочернем процессе. По истечении ctx процесс убивается и возвращается ErrParseTimeout;
// аварийное завершение процесса (память, паника, сигнал) даёт BrokenError.
func ParseIsolated(ctx context.Context, data []byte, maxPages int, now time.Time) (Draft, []string, error) {
	exe, err := os.Executable()
	if err != nil {
		return Draft{}, nil, &BrokenError{Err: err}
	}
	cmd := exec.CommandContext(ctx, exe)
	cmd.Env = []string{childEnv + "=1", "RESUME_MAX_PAGES=" + strconv.Itoa(maxPages), "RESUME_NOW=" + strconv.FormatInt(now.Unix(), 10), "GOGC=50"}
	cmd.Stdin = bytes.NewReader(data)
	out := &cappedBuffer{max: maxChildOutput}
	cmd.Stdout = out
	cmd.WaitDelay = time.Second
	runErr := cmd.Run()
	if ctx.Err() != nil {
		return Draft{}, nil, ErrParseTimeout
	}
	if runErr != nil {
		return Draft{}, nil, &BrokenError{Err: errors.New("процесс разбора завершился аварийно: " + runErr.Error())}
	}
	var result childResult
	if err := json.Unmarshal(out.buf.Bytes(), &result); err != nil {
		return Draft{}, nil, &BrokenError{Err: errors.New("некорректный ответ процесса разбора")}
	}
	if err := errOf(result.Kind, result.Message); err != nil {
		return Draft{}, nil, err
	}
	return result.Draft, result.Warnings, nil
}
