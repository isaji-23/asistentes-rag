import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 16, md: 24, lg: 40 };

export default function Spinner({ size = 'md' }: SpinnerProps) {
  const px = sizeMap[size];
  return (
    <span
      className={styles.spinner}
      style={{ width: px, height: px }}
      role="status"
      aria-label="Cargando"
    />
  );
}
