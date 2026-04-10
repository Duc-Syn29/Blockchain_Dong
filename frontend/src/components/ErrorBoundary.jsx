import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return (
        <section className="panel-card">
          <h2>Đã xảy ra lỗi</h2>
          <p className="page-feedback">
            Có lỗi khi tải trang này. Vui lòng làm mới trang và thử lại.
          </p>
        </section>
      );
    }

    return this.props.children;
  }
}
