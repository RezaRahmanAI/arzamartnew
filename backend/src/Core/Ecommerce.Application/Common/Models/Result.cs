namespace Ecommerce.Application.Common.Models;

public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Data { get; }
    public string? ErrorMessage { get; }
    public List<string> Errors { get; }

    protected Result(bool isSuccess, T? data, string? errorMessage, List<string>? errors = null)
    {
        IsSuccess = isSuccess;
        Data = data;
        ErrorMessage = errorMessage;
        Errors = errors ?? new List<string>();
    }

    public static Result<T> Success(T data) => new(true, data, null);
    public static Result<T> Failure(string errorMessage) => new(false, default, errorMessage);
    public static Result<T> Failure(List<string> errors) => new(false, default, null, errors);
}

public class Result : Result<object>
{
    protected Result(bool isSuccess, string? errorMessage, List<string>? errors = null)
        : base(isSuccess, null, errorMessage, errors) { }

    public static Result Success() => new(true, null);
    public static new Result Failure(string errorMessage) => new(false, errorMessage);
    public static new Result Failure(List<string> errors) => new(false, null, errors);
}
