//go:build unix

package resume

import "syscall"

// limitCPU ограничивает процессорное время дочернего процесса: ядро убьёт его по лимиту, даже если родитель не успеет.
func limitCPU(seconds uint64) {
	_ = syscall.Setrlimit(syscall.RLIMIT_CPU, &syscall.Rlimit{Cur: seconds, Max: seconds})
}
