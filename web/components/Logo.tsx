type Variant = "primary" | "secondary"; // primary = colored, secondary = mono
export function Logo({
  variant="primary",
  className="",
  alt="Cerberus logo",
}:{variant?:Variant; className?:string; alt?:string}) {
  const src = variant==="primary"
    ? "/brand/cerberus-logo-primary.png"    // colored
    : "/brand/cerberus-logo-secondary.png"; // mono
  return <img src={src} alt={alt} className={`h-10 w-auto ${className}`} />;
}
export default Logo;
