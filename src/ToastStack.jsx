import { Toaster } from 'react-hot-toast';

/** @component Container for toast notifications */
export default function ToastStack() {
  return <Toaster position="bottom-left" gutter={8} />;
}
