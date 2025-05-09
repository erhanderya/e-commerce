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
    public authService: AuthService,
    private fb: FormBuilder,
    public router: Router,
    private alertService: AlertService
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required]
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
    this.error = '';
    
    console.log('ProfileComponent - Loading user profile, token exists:', !!this.authService.getAuthToken());
    
    this.authService.getUserProfile().subscribe({
      next: (user: User) => {
        console.log('ProfileComponent - Profile loaded successfully:', user);
        this.user = user;
        this.profileForm.patchValue({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email,
          username: user.username
        });
        this.loading = false;
      },
      error: (err: any) => {
        console.error('ProfileComponent - Error loading user profile:', err);
        this.error = `Failed to load your profile: ${err.message || 'Unknown error'}. Please try refreshing the page.`;
        this.loading = false;
        
        if (err.status === 401 || err.status === 403) {
          this.alertService.error('Authentication required. Please log in again.');
          setTimeout(() => this.router.navigate(['/login']), 2000);
        }
      }
    });
  }

  onProfileSubmit(): void {
    if (this.profileForm.invalid) return;

    this.updating = true;
    const formData = this.profileForm.value;

    this.authService.updateUserProfile(formData).subscribe({
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
