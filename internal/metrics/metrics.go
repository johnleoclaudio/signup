package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// APIRequestsTotal tracks the total number of API requests
	APIRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "api_requests_total",
			Help: "Total number of API requests",
		},
		[]string{"method", "endpoint", "status_code"},
	)

	// SignupRequestsTotal tracks signup-specific requests
	SignupRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "signup_requests_total",
			Help: "Total number of signup requests",
		},
		[]string{"status_code"},
	)
)
