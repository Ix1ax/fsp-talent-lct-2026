package files

import (
	"bytes"
	"context"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3 struct{ client *s3.Client }

func NewS3(client *s3.Client) *S3 { return &S3{client: client} }
func (s *S3) Put(ctx context.Context, f File, data []byte) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{Bucket: aws.String(f.Bucket), Key: aws.String(f.ObjectKey), Body: bytes.NewReader(data), ContentType: aws.String(f.MediaType), ContentLength: aws.Int64(f.SizeBytes)})
	return err
}
func (s *S3) Get(ctx context.Context, f File) (io.ReadCloser, error) {
	result, err := s.client.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(f.Bucket), Key: aws.String(f.ObjectKey)})
	if err != nil {
		return nil, err
	}
	return result.Body, nil
}
func (s *S3) Delete(ctx context.Context, f File) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(f.Bucket), Key: aws.String(f.ObjectKey)})
	return err
}
