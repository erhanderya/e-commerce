import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { User } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  profileForm: FormGroup;
  passwordForm: FormGroup;
  loading: boolean = true;
  updating: boolean = false;
  changingPassword: boolean = false;
  error: string = '';
  showPasswordForm: boolean = false;

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private alertService: AlertService
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.loading = true;
    this.authService.getProfile().subscribe({
      next: (user: User | null) => {
        if (user) {
          this.user = user;
          this.profileForm.patchValue({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: (user as any).phone || '' // Assuming 'phone' exists on the user object from the backend
          });
        } else {
          this.alertService.error('Could not load profile. Please log in again.');
          this.router.navigate(['/login']);
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load your profile. Please try refreshing the page.';
        this.loading = false;
        console.error('Error loading user profile:', err);
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  onProfileSubmit(): void {
    if (this.profileForm.invalid || !this.user || !this.user.id) return;

    this.updating = true;
    const formData = this.profileForm.value;

    this.authService.updateUser(this.user.id, formData).subscribe({
      next: (updatedUser: User) => {
        this.user = updatedUser;
        this.updating = false;
        this.alertService.success('Your profile has been updated successfully');
      },
      error: (err: any) => {
        this.updating = false;
        this.alertService.error('Failed to update profile. Please try again.');
        console.error('Error updating user profile:', err);
      }
    });
  }

  onPasswordSubmit(): void {
    if (this.passwordForm.invalid) return;

    this.changingPassword = true;
    const { currentPassword, newPassword } = this.passwordForm.value;

    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.changingPassword = false;
        this.showPasswordForm = false;
        this.passwordForm.reset();
        this.alertService.success('Your password has been changed successfully');
      },
      error: (err: any) => {
        this.changingPassword = false;
        if (err.status === 401) {
          this.alertService.error('Current password is incorrect. Please try again.');
        } else {
          const errorMsg = err.error?.message || 'Failed to change password. Please try again.';
          this.alertService.error(errorMsg);
        }
        console.error('Error changing password:', err);
      }
    });
  }

  togglePasswordForm(): void {
    this.showPasswordForm = !this.showPasswordForm;
    if (!this.showPasswordForm) {
      this.passwordForm.reset();
    }
  }

  passwordMatchValidator(group: FormGroup): {[key: string]: boolean} | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return newPassword === confirmPassword ? null : { 'mismatch': true };
  }

  hasError(form: FormGroup, controlName: string, errorName: string): boolean {
    const control = form.get(controlName);
    return !!control && control.touched && control.hasError(errorName);
  }
}
