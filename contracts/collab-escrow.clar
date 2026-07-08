;; collab-escrow.clar
;; Mutual-consent escrow for FlowVault Hold Vaults

(define-constant err-unauthorized (err u100))
(define-constant err-not-found (err u101))
(define-constant err-already-confirmed (err u102))
(define-constant err-not-confirmer (err u103))
(define-constant err-already-released (err u104))
(define-constant err-wind-down-active (err u105))
(define-constant err-wind-down-not-active (err u106))
(define-constant err-wind-down-expired (err u107))
(define-constant err-wind-down-not-expired (err u108))

;; Status constants
(define-constant status-holding "holding")
(define-constant status-wind-down "wind-down")
(define-constant status-released "released")

;; A trait defining how we call FlowVault's release mechanism
(define-trait flowvault-trait
  (
    (release-funds (uint) (response bool uint))
  )
)

;; The core vault registry
(define-map vaults 
  uint 
  {
    creator: principal,
    total-amount: uint,
    threshold: uint,
    required-confirmations: uint,
    current-confirmations: uint,
    status: (string-ascii 10),
    wind-down-height: uint
  }
)

;; Maps vault-id and address to their deposit amount (for proportional wind-down refunds)
(define-map vault-depositors { vault-id: uint, depositor: principal } { amount: uint })

;; Maps vault-id and address to their confirmation status
(define-map vault-confirmers { vault-id: uint, confirmer: principal } { confirmed: bool })

;; Auto-incrementing vault ID
(define-data-var next-vault-id uint u1)

;; Helper to get the current block height
(define-read-only (get-block-height) block-height)
(define-read-only (get-vault (vault-id uint)) (map-get? vaults vault-id))
(define-read-only (get-confirmer-status (vault-id uint) (confirmer principal)) (map-get? vault-confirmers { vault-id: vault-id, confirmer: confirmer }))

;; --- Core Vault Creation ---

(define-public (create-vault (total-amount uint) (threshold uint) (required-confirmations uint))
  (let ((vault-id (var-get next-vault-id)))
    (map-insert vaults vault-id {
      creator: tx-sender,
      total-amount: total-amount,
      threshold: threshold,
      required-confirmations: required-confirmations,
      current-confirmations: u0,
      status: status-holding,
      wind-down-height: u0
    })
    (var-set next-vault-id (+ vault-id u1))
    (ok vault-id)
  )
)

(define-public (add-confirmer (vault-id uint) (confirmer principal))
  (let ((vault (unwrap! (map-get? vaults vault-id) err-not-found)))
    (asserts! (is-eq (get creator vault) tx-sender) err-unauthorized)
    (ok (map-insert vault-confirmers { vault-id: vault-id, confirmer: confirmer } { confirmed: false }))
  )
)

;; --- Confirmation and Release ---

(define-public (confirm-release (vault-id uint) (flowvault-contract <flowvault-trait>))
  (let (
    (vault (unwrap! (map-get? vaults vault-id) err-not-found))
    (confirmer-record (unwrap! (map-get? vault-confirmers { vault-id: vault-id, confirmer: tx-sender }) err-not-confirmer))
  )
    (asserts! (is-eq (get status vault) status-holding) err-already-released)
    (asserts! (not (get confirmed confirmer-record)) err-already-confirmed)

    ;; Mark as confirmed
    (map-set vault-confirmers { vault-id: vault-id, confirmer: tx-sender } { confirmed: true })
    
    (let (
      (new-confirmations (+ (get current-confirmations vault) u1))
      ;; Check if we hit the threshold requirement (adds +1 to required if total > threshold)
      (target-confirmations (if (and (> (get threshold vault) u0) (> (get total-amount vault) (get threshold vault))) 
                              (+ (get required-confirmations vault) u1) 
                              (get required-confirmations vault)))
    )
      (if (>= new-confirmations target-confirmations)
        (begin
          ;; Trigger release via FlowVault contract call
          (try! (contract-call? flowvault-contract release-funds vault-id))
          (map-set vaults vault-id (merge vault { current-confirmations: new-confirmations, status: status-released }))
          (ok true)
        )
        (begin
          (map-set vaults vault-id (merge vault { current-confirmations: new-confirmations }))
          (ok false)
        )
      )
    )
  )
)

;; --- Wind-Down Feature ---

(define-public (initiate-wind-down (vault-id uint))
  (let ((vault (unwrap! (map-get? vaults vault-id) err-not-found)))
    (asserts! (is-eq (get status vault) status-holding) err-already-released)
    ;; 144 blocks ~ 24 hours
    (map-set vaults vault-id (merge vault { status: status-wind-down, wind-down-height: (+ block-height u144) }))
    (ok true)
  )
)

(define-public (dispute-wind-down (vault-id uint))
  (let ((vault (unwrap! (map-get? vaults vault-id) err-not-found)))
    (asserts! (is-eq (get status vault) status-wind-down) err-wind-down-not-active)
    ;; Dispute cancels the wind down and locks funds again
    (map-set vaults vault-id (merge vault { status: status-holding, wind-down-height: u0 }))
    (ok true)
  )
)

(define-public (finalize-wind-down (vault-id uint) (flowvault-contract <flowvault-trait>))
  (let ((vault (unwrap! (map-get? vaults vault-id) err-not-found)))
    (asserts! (is-eq (get status vault) status-wind-down) err-wind-down-not-active)
    (asserts! (>= block-height (get wind-down-height vault)) err-wind-down-not-expired)
    
    ;; Trigger refund/release via FlowVault
    (try! (contract-call? flowvault-contract release-funds vault-id))
    (map-set vaults vault-id (merge vault { status: status-released }))
    (ok true)
  )
)
