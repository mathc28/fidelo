/**
 * Case d'acceptation des CGV et de l'accord de sous-traitance, commune à
 * l'activation du compte et à la page « Nos conditions ont évolué ».
 */
export function CaseCgv({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="auth-cgv">
      <input
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        J&apos;accepte les{" "}
        <a href="/cgv" target="_blank" rel="noopener">
          Conditions générales de vente
        </a>{" "}
        et l&apos;
        <a href="/cgv#sous-traitance" target="_blank" rel="noopener">
          accord de sous-traitance des données
        </a>
        .
      </span>
    </label>
  );
}
